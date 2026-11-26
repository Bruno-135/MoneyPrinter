-- Disparos de WhatsApp pela Evolution API (servidor próprio na Hostinger).
--
-- Peças:
--
--   whatsapp_chips      cada número ligado na Evolution (uma «instância»)
--   whatsapp_campanhas  um disparo: que chips, em que horas
--   whatsapp_envios     uma linha por pessoa; a fila do motor
--   whatsapp_mensagens  o que entra e sai em cada chip (a caixa de conversas)
--   whatsapp_sistema    uma linha só, com o token do motor. Sem políticas:
--                       ninguém de fora a lê, só as funções abaixo
--
-- O MOTOR. O pg_cron corre a cada minuto e, SÓ quando há um chip pronto e uma
-- pessoa à espera, chama a rota /api/whatsapp/motor da Vercel com o token do
-- motor. A rota pede trabalho à base (`whatsapp_reclamar`), manda pela
-- Evolution — a chave da Evolution vive só na Vercel — e devolve o resultado
-- (`whatsapp_resultado`). O token é gerado aqui dentro e nunca é escrito por
-- ninguém: não há segredo para guardar à mão, e não há chave de serviço na
-- aplicação (ver 0038).
--
-- O RITMO SEGURO é da base, não do ecrã: um envio por chip de cada vez, com
-- espera de ~intervalo minutos (70–130 %, para não ter cadência de máquina),
-- no máximo `limite_diario` nas últimas 24 h, e só entre `hora_inicio` e
-- `hora_fim` NA HORA DO PAÍS DE QUEM RECEBE. Três falhas seguidas travam o chip
-- até alguém o destravar no painel.
--
-- AQUECIMENTO. Um chip com `aquecer` tem dois travões a mais: o limite de
-- disparos sobe em rampa (5 por dia nos 3 primeiros dias, 10 até ao 7.º, 20 até
-- ao 14.º, depois o limite escolhido), e o motor manda-lhe frases curtas de
-- conversa, a horas aleatórias (25–110 min), para os outros chips do mesmo dono
-- e para os números de confiança (`whatsapp_aquecimento_numeros`), só das 9h às
-- 21h de quem recebe. Nunca a leads.
--
-- SAIR. Os eventos da Evolution chegam a /api/whatsapp/webhook/<token do chip>
-- e passam por `whatsapp_receber`: quem responde SAIR (ou PARAR, STOP...) vai
-- para `nao_contactar` pelo NÚMERO, e o que estava na fila para ele cancela-se.

create extension if not exists pg_net;
create extension if not exists pg_cron;

-- ---------- chips ----------
create table if not exists public.whatsapp_chips (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default public.current_owner_id(),
  instancia text not null check (instancia ~ '^[A-Za-z0-9_-]{1,60}$'),
  nome text not null default '',
  numero text,
  pais text not null default 'PT' check (pais in ('PT', 'BR')),
  estado text not null default 'desligado' check (estado in ('ligado', 'desligado', 'a_ligar')),
  ativo boolean not null default true,
  limite_diario integer not null default 30 check (limite_diario between 1 and 200),
  intervalo_min integer not null default 5 check (intervalo_min between 2 and 120),
  proximo_envio_em timestamptz not null default now(),
  falhas_seguidas integer not null default 0,
  travado_motivo text,
  -- Aquecimento: rampa no limite de disparos e conversas com números de confiança.
  aquecer boolean not null default true,
  aquecimento_desde date not null default current_date,
  proximo_aquecimento_em timestamptz not null default now(),
  webhook_token uuid not null default gen_random_uuid() unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_id, instancia)
);

alter table public.whatsapp_chips enable row level security;
drop policy if exists "whatsapp_chips: o dono manda" on public.whatsapp_chips;
create policy "whatsapp_chips: o dono manda" on public.whatsapp_chips for all to authenticated
  using (owner_id = (select public.current_owner_id()))
  with check (owner_id = (select public.current_owner_id()));

-- ---------- campanhas ----------
create table if not exists public.whatsapp_campanhas (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default public.current_owner_id(),
  nome text not null check (length(nome) between 1 and 120),
  -- 'aquecimento': uma por dono, criada pelo motor, nunca termina sozinha.
  tipo text not null default 'disparo' check (tipo in ('disparo', 'aquecimento')),
  estado text not null default 'a_correr'
    check (estado in ('a_correr', 'pausada', 'terminada', 'cancelada')),
  -- Vazio = todos os chips ativos.
  chips uuid[] not null default '{}',
  hora_inicio smallint not null default 8 check (hora_inicio between 0 and 23),
  hora_fim smallint not null default 20 check (hora_fim between 1 and 24),
  criada_por uuid default auth.uid(),
  terminada_em timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (hora_fim > hora_inicio)
);

alter table public.whatsapp_campanhas enable row level security;
drop policy if exists "whatsapp_campanhas: o dono manda" on public.whatsapp_campanhas;
create policy "whatsapp_campanhas: o dono manda" on public.whatsapp_campanhas for all to authenticated
  using (owner_id = (select public.current_owner_id()))
  with check (owner_id = (select public.current_owner_id()));

-- ---------- envios ----------
create table if not exists public.whatsapp_envios (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default public.current_owner_id(),
  campanha_id uuid not null references public.whatsapp_campanhas (id) on delete cascade,
  business_id uuid references public.businesses (id) on delete set null,
  chip_id uuid references public.whatsapp_chips (id) on delete set null,
  -- Só dígitos, com o indicativo: 351912345678.
  numero text not null check (numero ~ '^[1-9][0-9]{7,14}$'),
  pais text not null default 'PT' check (pais in ('PT', 'BR')),
  nome text,
  -- Pode levar {saudacao}, trocado na hora do envio pela hora de quem recebe.
  texto text not null check (length(texto) between 1 and 4000),
  ordem integer not null default 0,
  estado text not null default 'pendente'
    check (estado in ('pendente', 'a_enviar', 'enviado', 'falhou', 'cancelado', 'excluido')),
  erro text,
  mensagem_id text,
  tentado_em timestamptz,
  enviado_em timestamptz,
  respondeu_em timestamptz,
  -- Mensagem de aquecimento: o mesmo número recebe várias, e não conta como disparo.
  aquecimento boolean not null default false,
  created_at timestamptz not null default now()
);

-- Num disparo, uma mensagem por número.
create unique index if not exists whatsapp_envios_um_por_numero_idx
  on public.whatsapp_envios (campanha_id, numero) where not aquecimento;
create index if not exists whatsapp_envios_fila_idx
  on public.whatsapp_envios (campanha_id, ordem) where estado = 'pendente';
create index if not exists whatsapp_envios_numero_idx on public.whatsapp_envios (owner_id, numero);
create index if not exists whatsapp_envios_chip_idx
  on public.whatsapp_envios (chip_id, tentado_em desc) where chip_id is not null;

alter table public.whatsapp_envios enable row level security;
drop policy if exists "whatsapp_envios: o dono manda" on public.whatsapp_envios;
create policy "whatsapp_envios: o dono manda" on public.whatsapp_envios for all to authenticated
  using (owner_id = (select public.current_owner_id()))
  with check (owner_id = (select public.current_owner_id()));

-- ---------- mensagens (caixa de conversas) ----------
create table if not exists public.whatsapp_mensagens (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null,
  chip_id uuid not null references public.whatsapp_chips (id) on delete cascade,
  numero text not null,
  business_id uuid references public.businesses (id) on delete set null,
  de_mim boolean not null,
  texto text,
  tipo text not null default 'texto',
  nome_contacto text,
  mensagem_id text,
  enviada_em timestamptz not null default now(),
  lida boolean not null default false,
  created_at timestamptz not null default now()
);

create unique index if not exists whatsapp_mensagens_id_idx
  on public.whatsapp_mensagens (chip_id, mensagem_id) where mensagem_id is not null;
create index if not exists whatsapp_mensagens_conversa_idx
  on public.whatsapp_mensagens (owner_id, numero, enviada_em desc);

alter table public.whatsapp_mensagens enable row level security;
drop policy if exists "whatsapp_mensagens: o dono manda" on public.whatsapp_mensagens;
create policy "whatsapp_mensagens: o dono manda" on public.whatsapp_mensagens for all to authenticated
  using (owner_id = (select public.current_owner_id()))
  with check (owner_id = (select public.current_owner_id()));

-- ---------- números de confiança para o aquecimento ----------
-- Gente que conhece o dono e aceitou receber umas mensagens (amigos, família,
-- outros telemóveis dele). Os outros chips do mesmo dono entram sozinhos.
create table if not exists public.whatsapp_aquecimento_numeros (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default public.current_owner_id(),
  numero text not null check (numero ~ '^[1-9][0-9]{7,14}$'),
  nome text not null default '',
  pais text not null default 'PT' check (pais in ('PT', 'BR')),
  created_at timestamptz not null default now(),
  unique (owner_id, numero)
);

alter table public.whatsapp_aquecimento_numeros enable row level security;
drop policy if exists "whatsapp_aquecimento_numeros: o dono manda" on public.whatsapp_aquecimento_numeros;
create policy "whatsapp_aquecimento_numeros: o dono manda" on public.whatsapp_aquecimento_numeros
  for all to authenticated
  using (owner_id = (select public.current_owner_id()))
  with check (owner_id = (select public.current_owner_id()));

-- ---------- não contactar, também por número ----------
alter table public.nao_contactar add column if not exists telefone text;
alter table public.nao_contactar drop constraint if exists tem_email_ou_negocio;
alter table public.nao_contactar add constraint tem_email_ou_negocio
  check (email is not null or business_id is not null or telefone is not null);
create unique index if not exists nao_contactar_telefone_idx
  on public.nao_contactar (owner_id, telefone) where telefone is not null;

-- ---------- o motor ----------
create table if not exists public.whatsapp_sistema (
  id boolean primary key default true check (id),
  token_do_motor uuid not null default gen_random_uuid(),
  url_do_motor text not null default 'https://vaidesign.net/api/whatsapp/motor'
);
alter table public.whatsapp_sistema enable row level security;
revoke all on table public.whatsapp_sistema from anon, authenticated;
insert into public.whatsapp_sistema default values on conflict do nothing;

create or replace function public.whatsapp_hora_local(p_pais text)
returns integer
language sql
stable
set search_path = public
as $$
  select extract(hour from now() at time zone
    case p_pais when 'BR' then 'America/Sao_Paulo' else 'Europe/Lisbon' end)::integer;
$$;

-- As mesmas horas de `saudacao()` em src/lib/whatsapp/mensagem.ts.
create or replace function public.whatsapp_saudacao(p_pais text)
returns text
language sql
stable
set search_path = public
as $$
  select case
    when public.whatsapp_hora_local(p_pais) between 5 and 11 then 'bom dia'
    when public.whatsapp_hora_local(p_pais) between 12 and 18 then 'boa tarde'
    else 'boa noite'
  end;
$$;

-- Rampa do aquecimento: quantos DISPAROS um chip pode fazer por dia. Um chip
-- novo começa devagar; quem desliga o aquecimento usa o limite que escolheu.
create or replace function public.whatsapp_limite_hoje(p_chip public.whatsapp_chips)
returns integer
language sql
stable
set search_path = public
as $$
  select case
    when not p_chip.aquecer then p_chip.limite_diario
    else least(p_chip.limite_diario, case
      when current_date - p_chip.aquecimento_desde < 3 then 5
      when current_date - p_chip.aquecimento_desde < 7 then 10
      when current_date - p_chip.aquecimento_desde < 14 then 20
      else p_chip.limite_diario
    end)
  end;
$$;

-- Quantas mensagens de aquecimento por dia: muitas no início, depois só as
-- suficientes para o número continuar a parecer usado.
create or replace function public.whatsapp_meta_aquecimento(p_chip public.whatsapp_chips)
returns integer
language sql
stable
set search_path = public
as $$
  select case
    when not p_chip.aquecer then 0
    when current_date - p_chip.aquecimento_desde < 7 then 10
    when current_date - p_chip.aquecimento_desde < 14 then 7
    else 4
  end;
$$;

-- Os chips que podem fazer um DISPARO agora: ligados, ativos, não travados, já
-- passou a espera e ainda não chegaram ao limite de hoje (aquecimento à parte).
create or replace function public.whatsapp_chips_prontos()
returns setof public.whatsapp_chips
language sql
stable
security definer
set search_path = public
as $$
  select c.*
  from public.whatsapp_chips c
  where c.ativo
    and c.estado = 'ligado'
    and c.travado_motivo is null
    and c.proximo_envio_em <= now()
    and (
      select count(*) from public.whatsapp_envios e
      where e.chip_id = c.id
        and not e.aquecimento
        and e.estado in ('enviado', 'a_enviar')
        and e.tentado_em > now() - interval '24 hours'
    ) < public.whatsapp_limite_hoje(c);
$$;

-- O próximo disparo que este chip pode fazer agora, ou nada.
create or replace function public.whatsapp_proximo_para(p_chip public.whatsapp_chips)
returns public.whatsapp_envios
language sql
stable
security definer
set search_path = public
as $$
  select e.*
  from public.whatsapp_envios e
  join public.whatsapp_campanhas k on k.id = e.campanha_id
  where e.owner_id = p_chip.owner_id
    and e.estado = 'pendente'
    and k.estado = 'a_correr'
    and k.tipo = 'disparo'
    and (cardinality(k.chips) = 0 or p_chip.id = any (k.chips))
    and public.whatsapp_hora_local(e.pais) >= k.hora_inicio
    and public.whatsapp_hora_local(e.pais) < k.hora_fim
  order by k.created_at, e.ordem
  limit 1;
$$;

-- Está na hora de uma mensagem de aquecimento neste chip?
create or replace function public.whatsapp_aquecimento_devido(p_chip public.whatsapp_chips)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select p_chip.aquecer
    and p_chip.ativo
    and p_chip.estado = 'ligado'
    and p_chip.travado_motivo is null
    and p_chip.proximo_aquecimento_em <= now()
    and (
      select count(*) from public.whatsapp_envios e
      where e.chip_id = p_chip.id
        and e.aquecimento
        and e.estado in ('enviado', 'a_enviar')
        and e.tentado_em > now() - interval '24 hours'
    ) < public.whatsapp_meta_aquecimento(p_chip);
$$;

-- Frases curtas de quem fala com quem conhece. Sem links, sem vendas: é
-- conversa, não publicidade. Nenhuma depende da hora (nada de «bom dia»):
-- saem a qualquer hora entre as 9h e as 21h.
create or replace function public.whatsapp_frase_de_aquecimento(p_pais text)
returns text
language sql
volatile
set search_path = public
as $$
  select (case when p_pais = 'BR' then array[
    'Oi! Tudo bem por aí?',
    'E aí, como tá a semana?',
    'Tudo certo contigo?',
    'E aí, novidades?',
    'Viu aquilo que te mandei?',
    'Depois me liga quando puder',
    'Valeu pela ajuda ontem!',
    'Tá tudo combinado pra amanhã?',
    'Hoje o dia tá corrido aqui',
    'Viu aquilo do fim de semana?',
    'Que calor hoje, hein',
    'Me lembra daquilo mais tarde',
    'Chegou bem?',
    'Tô saindo agora, falo contigo depois',
    'Bora tomar um café essa semana?',
    'Show, obrigado!',
    'Beleza, combinado então',
    'Como foi o fim de semana?',
    'Vou ver isso e te falo',
    'Tudo tranquilo por aqui, e contigo?'
  ] else array[
    'Olá! Tudo bem por aí?',
    'Então, como está a correr a semana?',
    'Tudo bem contigo?',
    'Então, novidades?',
    'Viste aquilo que te mandei?',
    'Depois liga-me quando puderes',
    'Obrigado pela ajuda ontem!',
    'Está tudo combinado para amanhã?',
    'Hoje o dia está complicado aqui',
    'Viste aquilo do fim de semana?',
    'Que calor que está hoje',
    'Lembra-me daquilo mais logo',
    'Chegaste bem?',
    'Vou sair agora, falamos depois',
    'Vamos tomar um café esta semana?',
    'Boa, obrigado!',
    'Combinado então',
    'Como correu o fim de semana?',
    'Vou ver isso e já te digo',
    'Por aqui tudo tranquilo, e contigo?'
  ] end)[1 + floor(random() * 20)::integer];
$$;

-- Cria (já 'a_enviar') uma mensagem de aquecimento para um número de
-- confiança ou outro chip do mesmo dono, dentro das 9h–21h de quem recebe.
create or replace function public.whatsapp_criar_aquecimento(p_chip public.whatsapp_chips)
returns public.whatsapp_envios
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  alvo record;
  k_id uuid;
  v public.whatsapp_envios;
begin
  select n.numero, n.pais into alvo
  from (
    select a.numero, a.pais from public.whatsapp_aquecimento_numeros a
    where a.owner_id = p_chip.owner_id
    union
    select o.numero, o.pais from public.whatsapp_chips o
    where o.owner_id = p_chip.owner_id and o.id <> p_chip.id and o.numero is not null
  ) n
  where n.numero is distinct from p_chip.numero
    and n.numero ~ '^[1-9][0-9]{7,14}$'
    and public.whatsapp_hora_local(n.pais) between 9 and 20
  order by random()
  limit 1;

  if alvo.numero is null then
    -- Sem ninguém a quem mandar agora: tenta daqui a uma hora.
    update public.whatsapp_chips set proximo_aquecimento_em = now() + interval '1 hour'
    where id = p_chip.id;
    return null;
  end if;

  select id into k_id from public.whatsapp_campanhas
  where owner_id = p_chip.owner_id and tipo = 'aquecimento'
  order by created_at limit 1;
  if k_id is null then
    insert into public.whatsapp_campanhas (owner_id, nome, tipo, estado, criada_por)
    values (p_chip.owner_id, 'Aquecimento dos chips', 'aquecimento', 'a_correr', null)
    returning id into k_id;
  end if;

  insert into public.whatsapp_envios
    (owner_id, campanha_id, chip_id, numero, pais, texto, estado, tentado_em, aquecimento)
  values (p_chip.owner_id, k_id, p_chip.id, alvo.numero, alvo.pais,
          public.whatsapp_frase_de_aquecimento(alvo.pais), 'a_enviar', now(), true)
  returning * into v;

  -- Entre 25 e 110 minutos até à próxima, e nunca um disparo logo a seguir.
  update public.whatsapp_chips
  set proximo_aquecimento_em = now() + make_interval(mins => 25 + floor(random() * 86)::integer),
      proximo_envio_em = greatest(proximo_envio_em, now() + interval '3 minutes'),
      updated_at = now()
  where id = p_chip.id;

  return v;
end;
$$;

-- Chamada pelo pg_cron a cada minuto. Arruma o que ficou a meio e só acorda a
-- Vercel quando há de facto alguma coisa para mandar.
create or replace function public.whatsapp_chamar_motor()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  s public.whatsapp_sistema;
  ha_trabalho boolean := false;
  c public.whatsapp_chips;
begin
  -- Um envio que não voltou em 15 minutos não se repete (podia ter saído):
  -- fica como falhado, à vista.
  update public.whatsapp_envios
  set estado = 'falhou', erro = 'sem confirmação do envio'
  where estado = 'a_enviar' and tentado_em < now() - interval '15 minutes';

  -- Disparos sem nada por mandar terminam sozinhos.
  update public.whatsapp_campanhas k
  set estado = 'terminada', terminada_em = now(), updated_at = now()
  where k.estado = 'a_correr'
    and k.tipo = 'disparo'
    and not exists (
      select 1 from public.whatsapp_envios e
      where e.campanha_id = k.id and e.estado in ('pendente', 'a_enviar')
    );

  for c in select * from public.whatsapp_chips_prontos() loop
    if (public.whatsapp_proximo_para(c)).id is not null then
      ha_trabalho := true;
      exit;
    end if;
  end loop;
  if not ha_trabalho then
    ha_trabalho := exists (
      select 1 from public.whatsapp_chips c2 where public.whatsapp_aquecimento_devido(c2)
    );
  end if;
  if not ha_trabalho then
    return;
  end if;

  select * into s from public.whatsapp_sistema limit 1;
  perform net.http_post(
    url := s.url_do_motor,
    body := '{}'::jsonb,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-motor-token', s.token_do_motor::text
    ),
    timeout_milliseconds := 55000
  );
end;
$$;

-- A rota do motor pede trabalho: no máximo um envio por chip. Primeiro um
-- disparo, se houver; senão, uma mensagem de aquecimento, se for a hora.
create or replace function public.whatsapp_reclamar(p_token uuid)
returns table (envio_id uuid, instancia text, numero text, texto text, aquecimento boolean)
language plpgsql
security definer
set search_path = public
as $$
#variable_conflict use_column
declare
  c public.whatsapp_chips;
  v public.whatsapp_envios;
  pronto boolean;
begin
  if not exists (select 1 from public.whatsapp_sistema where token_do_motor = p_token) then
    return;
  end if;

  for c in
    select * from public.whatsapp_chips w
    where w.ativo and w.estado = 'ligado' and w.travado_motivo is null
    for update skip locked
  loop
    v := null;
    pronto := exists (select 1 from public.whatsapp_chips_prontos() p where p.id = c.id);

    if pronto then
      v := public.whatsapp_proximo_para(c);
      if v.id is not null then
        -- Trancar a linha: dois motores ao mesmo tempo não pegam na mesma pessoa.
        perform 1 from public.whatsapp_envios where id = v.id and estado = 'pendente'
        for update skip locked;
        if not found then
          v := null;
        elsif exists (
          -- A lista de não contactar vê-se de novo na hora: pode ter mudado desde a campanha.
          select 1 from public.nao_contactar n
          where n.owner_id = c.owner_id
            and (n.telefone = v.numero or (v.business_id is not null and n.business_id = v.business_id))
        ) then
          update public.whatsapp_envios set estado = 'excluido', erro = 'na lista de não contactar'
          where id = v.id;
          v := null;
        else
          update public.whatsapp_envios e
          set estado = 'a_enviar',
              chip_id = c.id,
              tentado_em = now(),
              texto = replace(e.texto, '{saudacao}', public.whatsapp_saudacao(e.pais))
          where e.id = v.id
          returning e.* into v;

          update public.whatsapp_chips
          set proximo_envio_em = now() + make_interval(secs => c.intervalo_min * 60 * (0.7 + random() * 0.6)),
              proximo_aquecimento_em = greatest(proximo_aquecimento_em, now() + interval '10 minutes'),
              updated_at = now()
          where id = c.id;
        end if;
      end if;
    end if;

    if v.id is null and public.whatsapp_aquecimento_devido(c) then
      v := public.whatsapp_criar_aquecimento(c);
    end if;

    if v.id is not null then
      envio_id := v.id;
      instancia := c.instancia;
      numero := v.numero;
      texto := v.texto;
      aquecimento := v.aquecimento;
      return next;
    end if;
  end loop;
end;
$$;

-- O que aconteceu a um envio. `p_culpa_do_chip` = false quando o número não
-- tem WhatsApp: isso não diz nada sobre o chip e não conta para o travão.
create or replace function public.whatsapp_resultado(
  p_token uuid,
  p_envio uuid,
  p_ok boolean,
  p_mensagem_id text default null,
  p_erro text default null,
  p_culpa_do_chip boolean default true
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v public.whatsapp_envios;
  falhas integer;
begin
  if not exists (select 1 from public.whatsapp_sistema where token_do_motor = p_token) then
    return;
  end if;

  select * into v from public.whatsapp_envios where id = p_envio and estado = 'a_enviar' for update;
  if not found then
    return;
  end if;

  if p_ok then
    update public.whatsapp_envios
    set estado = 'enviado', enviado_em = now(), mensagem_id = left(p_mensagem_id, 200), erro = null
    where id = v.id;

    update public.whatsapp_chips set falhas_seguidas = 0, updated_at = now() where id = v.chip_id;

    insert into public.whatsapp_mensagens (owner_id, chip_id, numero, business_id, de_mim, texto, mensagem_id)
    values (v.owner_id, v.chip_id, v.numero, v.business_id, true, v.texto, left(p_mensagem_id, 200))
    on conflict do nothing;

    -- O mesmo que o botão da Lista de WhatsApp grava (src/lib/whatsapp/contacto.ts).
    if v.business_id is not null then
      insert into public.contact_events (owner_id, business_id, outcome, channel, note)
      values (v.owner_id, v.business_id, 'contactado', 'whatsapp', 'Disparo automático');

      insert into public.deals (owner_id, business_id, next_action, next_action_at, last_contacted_at)
      values (v.owner_id, v.business_id, 'WhatsApp enviado — à espera de resposta.',
              now() + interval '3 days', now())
      on conflict (owner_id, business_id) do update
      set next_action = excluded.next_action,
          next_action_at = excluded.next_action_at,
          last_contacted_at = excluded.last_contacted_at;
    end if;
    return;
  end if;

  update public.whatsapp_envios set estado = 'falhou', erro = left(coalesce(p_erro, 'erro'), 500)
  where id = v.id;

  if p_culpa_do_chip and v.chip_id is not null then
    update public.whatsapp_chips
    set falhas_seguidas = falhas_seguidas + 1, updated_at = now()
    where id = v.chip_id
    returning falhas_seguidas into falhas;

    if falhas >= 3 then
      update public.whatsapp_chips
      set travado_motivo = 'Três falhas seguidas. Última: ' || left(coalesce(p_erro, 'erro'), 200)
      where id = v.chip_id;
    end if;
  end if;
end;
$$;

-- Os eventos que a Evolution manda para um chip.
create or replace function public.whatsapp_receber(p_token uuid, p_evento jsonb)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  c public.whatsapp_chips;
  ev text;
  d jsonb;
  jid text;
  v_numero text;
  v_de_mim boolean;
  v_texto text;
  v_quando timestamptz;
  v_negocio uuid;
  palavra text;
begin
  select * into c from public.whatsapp_chips where webhook_token = p_token;
  if not found then
    return 'desconhecido';
  end if;

  ev := lower(replace(coalesce(p_evento ->> 'event', ''), '_', '.'));
  d := p_evento -> 'data';

  if ev = 'connection.update' then
    update public.whatsapp_chips
    set estado = case d ->> 'state' when 'open' then 'ligado' when 'connecting' then 'a_ligar' else 'desligado' end,
        updated_at = now()
    where id = c.id;
    return 'ligacao';
  end if;

  if ev <> 'messages.upsert' or d is null or jsonb_typeof(d) <> 'object' then
    return 'ignorado';
  end if;

  jid := d -> 'key' ->> 'remoteJid';
  if jid like '%@lid' then
    jid := coalesce(d -> 'key' ->> 'remoteJidAlt', d -> 'key' ->> 'senderPn', jid);
  end if;
  -- Só conversas com pessoas: grupos, estados e canais ficam de fora.
  if jid is null or jid not like '%@s.whatsapp.net' then
    return 'ignorado';
  end if;

  v_numero := regexp_replace(split_part(split_part(jid, '@', 1), ':', 1), '\D', '', 'g');
  if v_numero !~ '^[1-9][0-9]{7,14}$' then
    return 'ignorado';
  end if;

  v_de_mim := coalesce((d -> 'key' ->> 'fromMe')::boolean, false);
  v_texto := coalesce(
    d -> 'message' ->> 'conversation',
    d -> 'message' -> 'extendedTextMessage' ->> 'text',
    d -> 'message' -> 'imageMessage' ->> 'caption',
    d -> 'message' -> 'videoMessage' ->> 'caption'
  );
  v_quando := case
    when (d ->> 'messageTimestamp') ~ '^\d+$' then to_timestamp((d ->> 'messageTimestamp')::bigint)
    else now()
  end;

  select e.business_id into v_negocio from public.whatsapp_envios e
  where e.owner_id = c.owner_id and e.numero = v_numero and e.business_id is not null
  order by e.created_at desc limit 1;
  if v_negocio is null then
    select b.id into v_negocio from public.businesses b
    where b.owner_id = c.owner_id and b.phone_e164 = '+' || v_numero
    limit 1;
  end if;

  insert into public.whatsapp_mensagens
    (owner_id, chip_id, numero, business_id, de_mim, texto, tipo, nome_contacto, mensagem_id, enviada_em)
  values (
    c.owner_id, c.id, v_numero, v_negocio, v_de_mim, left(v_texto, 4000),
    coalesce(d ->> 'messageType', 'texto'),
    case when v_de_mim then null else left(d ->> 'pushName', 120) end,
    left(d -> 'key' ->> 'id', 200), v_quando
  )
  on conflict do nothing;

  if v_de_mim then
    return 'minha';
  end if;

  update public.whatsapp_envios
  set respondeu_em = coalesce(respondeu_em, v_quando)
  where owner_id = c.owner_id and numero = v_numero and estado = 'enviado';

  palavra := upper(regexp_replace(coalesce(v_texto, ''), '[^[:alpha:]]', '', 'g'));
  if palavra in ('SAIR', 'PARAR', 'STOP', 'CANCELAR', 'REMOVER', 'DESCADASTRAR') then
    insert into public.nao_contactar (owner_id, business_id, telefone, motivo)
    values (c.owner_id, v_negocio, v_numero, 'respondeu ' || palavra || ' no WhatsApp')
    on conflict do nothing;

    update public.whatsapp_envios set estado = 'cancelado', erro = 'pediu para sair'
    where owner_id = c.owner_id and numero = v_numero and estado = 'pendente';
    return 'saiu';
  end if;

  return 'mensagem';
end;
$$;

revoke all on function public.whatsapp_hora_local(text) from public;
revoke all on function public.whatsapp_saudacao(text) from public;
revoke all on function public.whatsapp_limite_hoje(public.whatsapp_chips) from public;
revoke all on function public.whatsapp_meta_aquecimento(public.whatsapp_chips) from public;
revoke all on function public.whatsapp_aquecimento_devido(public.whatsapp_chips) from public;
revoke all on function public.whatsapp_frase_de_aquecimento(text) from public;
revoke all on function public.whatsapp_criar_aquecimento(public.whatsapp_chips) from public;
revoke all on function public.whatsapp_chips_prontos() from public;
revoke all on function public.whatsapp_proximo_para(public.whatsapp_chips) from public;
revoke all on function public.whatsapp_chamar_motor() from public;
revoke all on function public.whatsapp_reclamar(uuid) from public;
revoke all on function public.whatsapp_resultado(uuid, uuid, boolean, text, text, boolean) from public;
revoke all on function public.whatsapp_receber(uuid, jsonb) from public;

-- O Supabase dá EXECUTE a anon e authenticated em cada função nova, por
-- omissão e por nome (não pelo PUBLIC). As internas devolvem linhas de todos
-- os donos (e o token de cada chip): tirar-lhes o acesso explicitamente.
revoke execute on function public.whatsapp_chips_prontos() from anon, authenticated;
revoke execute on function public.whatsapp_proximo_para(public.whatsapp_chips) from anon, authenticated;
revoke execute on function public.whatsapp_aquecimento_devido(public.whatsapp_chips) from anon, authenticated;
revoke execute on function public.whatsapp_criar_aquecimento(public.whatsapp_chips) from anon, authenticated;
revoke execute on function public.whatsapp_frase_de_aquecimento(text) from anon, authenticated;
revoke execute on function public.whatsapp_chamar_motor() from anon, authenticated;

grant execute on function public.whatsapp_hora_local(text) to authenticated;
grant execute on function public.whatsapp_saudacao(text) to authenticated;
grant execute on function public.whatsapp_limite_hoje(public.whatsapp_chips) to authenticated;
grant execute on function public.whatsapp_meta_aquecimento(public.whatsapp_chips) to authenticated;
-- Chamadas sem sessão (a Vercel a mando do cron, a Evolution): a guarda é o token.
grant execute on function public.whatsapp_reclamar(uuid) to anon, authenticated;
grant execute on function public.whatsapp_resultado(uuid, uuid, boolean, text, text, boolean) to anon, authenticated;
grant execute on function public.whatsapp_receber(uuid, jsonb) to anon, authenticated;

select cron.schedule('whatsapp-motor', '* * * * *', 'select public.whatsapp_chamar_motor()');
