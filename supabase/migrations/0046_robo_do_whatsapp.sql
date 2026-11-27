-- O robô com IA nas conversas do WhatsApp (Fase 2).
--
--   whatsapp_robo        a configuração, uma linha por dono: ligado, o que sabe
--                        da empresa, o objetivo, a quem responde, horas, modelo
--   whatsapp_conversas   o estado de cada conversa (dono + número): robô ligado
--                        ou não, uma pessoa assumiu, quando responder, lead
--                        quente, seguimento
--   whatsapp_mensagens   ganha `origem`: 'disparo', 'aquecimento', 'robo',
--                        'painel'. Uma mensagem NOSSA sem origem foi escrita no
--                        telemóvel — é assim que se sabe que uma pessoa entrou
--                        na conversa e o robô se cala.
--
-- COMO RESPONDE. Uma mensagem que entra marca `responder_em` para daqui a 25 s
-- (cada mensagem nova empurra: quem escreve três seguidas recebe uma resposta
-- só, às três). O pg_cron já acorda o motor a cada minuto; o motor pede o
-- trabalho (`whatsapp_reclamar_robo`), escreve a resposta com a IA, manda pela
-- Evolution e grava (`whatsapp_robo_resultado`). Responder entre 25 s e
-- minuto e meio depois é o tempo de uma pessoa, não de uma máquina.
--
-- QUANDO SE CALA: robô desligado; conversa com o robô desligado (exclusão);
-- uma pessoa escreveu do telemóvel ou do painel; chegou ao máximo de
-- respostas; a pessoa pediu para sair; a IA pediu um humano; fora de horas.
--
-- SEGUIMENTO: UM só por conversa, se a última mensagem foi do robô e a
-- pessoa não respondeu em `seguimento_horas`.

create table if not exists public.whatsapp_robo (
  owner_id uuid primary key default public.current_owner_id(),
  ativo boolean not null default false,
  modelo text not null default 'claude-opus-5-5'
    check (modelo in ('claude-opus-5-5', 'claude-sonnet-5-5', 'claude-haiku-5-5')),
  -- 'disparos': só quem recebeu um disparo · 'leads': também leads da base · 'todos'
  responder_a text not null default 'disparos' check (responder_a in ('disparos', 'leads', 'todos')),
  sobre text not null default '',
  objetivo text not null default '',
  regras text not null default '',
  -- Para onde vai o aviso de lead quente (pelo próprio chip). Só dígitos.
  avisar_numero text check (avisar_numero is null or avisar_numero ~ '^[1-9][0-9]{7,14}$'),
  hora_inicio smallint not null default 8 check (hora_inicio between 0 and 23),
  hora_fim smallint not null default 22 check (hora_fim between 1 and 24),
  max_respostas integer not null default 12 check (max_respostas between 1 and 50),
  seguimento boolean not null default true,
  seguimento_horas integer not null default 24 check (seguimento_horas between 2 and 168),
  updated_at timestamptz not null default now(),
  check (hora_fim > hora_inicio)
);

alter table public.whatsapp_robo enable row level security;
drop policy if exists "whatsapp_robo: o dono manda" on public.whatsapp_robo;
create policy "whatsapp_robo: o dono manda" on public.whatsapp_robo for all to authenticated
  using (owner_id = (select public.current_owner_id()))
  with check (owner_id = (select public.current_owner_id()));

create table if not exists public.whatsapp_conversas (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null,
  numero text not null check (numero ~ '^[1-9][0-9]{7,14}$'),
  chip_id uuid references public.whatsapp_chips (id) on delete set null,
  business_id uuid references public.businesses (id) on delete set null,
  robo_ativo boolean not null default true,
  humano_desde timestamptz,
  -- «Devolver ao robô»: mensagens do telemóvel ANTES disto já não contam.
  devolvido_em timestamptz,
  responder_em timestamptz,
  a_responder_desde timestamptz,
  respostas_robo integer not null default 0,
  quente boolean not null default false,
  quente_em timestamptz,
  motivo text,
  seguimento_em timestamptz,
  seguimento_feito boolean not null default false,
  ultima_entrada_em timestamptz,
  ultima_saida_em timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_id, numero)
);

create index if not exists whatsapp_conversas_responder_idx
  on public.whatsapp_conversas (responder_em) where responder_em is not null;
create index if not exists whatsapp_conversas_seguimento_idx
  on public.whatsapp_conversas (seguimento_em) where seguimento_em is not null and not seguimento_feito;

alter table public.whatsapp_conversas enable row level security;
drop policy if exists "whatsapp_conversas: o dono manda" on public.whatsapp_conversas;
create policy "whatsapp_conversas: o dono manda" on public.whatsapp_conversas for all to authenticated
  using (owner_id = (select public.current_owner_id()))
  with check (owner_id = (select public.current_owner_id()));

alter table public.whatsapp_mensagens add column if not exists origem text
  check (origem is null or origem in ('disparo', 'aquecimento', 'robo', 'painel'));

-- ---------- regras ----------

-- Este número está numa conversa a que o robô pode responder agora?
create or replace function public.whatsapp_robo_pode(p_conversa public.whatsapp_conversas)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.whatsapp_robo r
    where r.owner_id = p_conversa.owner_id
      and r.ativo
      and p_conversa.robo_ativo
      and p_conversa.humano_desde is null
      and p_conversa.respostas_robo < r.max_respostas
      -- Números de confiança e os próprios chips são do aquecimento, não do robô.
      and not exists (select 1 from public.whatsapp_aquecimento_numeros a
                      where a.owner_id = p_conversa.owner_id and a.numero = p_conversa.numero)
      and not exists (select 1 from public.whatsapp_chips o
                      where o.owner_id = p_conversa.owner_id and o.numero = p_conversa.numero)
      and not exists (select 1 from public.nao_contactar n
                      where n.owner_id = p_conversa.owner_id and n.telefone = p_conversa.numero)
      and (
        r.responder_a = 'todos'
        or exists (select 1 from public.whatsapp_envios e
                   where e.owner_id = p_conversa.owner_id and e.numero = p_conversa.numero
                     and not e.aquecimento and e.estado = 'enviado')
        or (r.responder_a = 'leads' and p_conversa.business_id is not null)
      )
  );
$$;

-- Uma pessoa escreveu nesta conversa, do telemóvel? (Mensagem nossa sem origem,
-- com mais de 20 s — o tempo de o robô gravar as dele — e depois da devolução.)
create or replace function public.whatsapp_humano_escreveu(p_conversa public.whatsapp_conversas)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.whatsapp_mensagens m
    where m.owner_id = p_conversa.owner_id
      and m.numero = p_conversa.numero
      and m.de_mim
      and m.origem is null
      and m.created_at < now() - interval '20 seconds'
      and m.created_at > coalesce(p_conversa.devolvido_em, '-infinity'::timestamptz)
  );
$$;

-- ---------- o resultado de um envio passa a dizer a origem ----------
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

    -- Com a origem, mesmo que o webhook da própria mensagem tenha chegado antes.
    insert into public.whatsapp_mensagens
      (owner_id, chip_id, numero, business_id, de_mim, texto, mensagem_id, origem, lida)
    values (v.owner_id, v.chip_id, v.numero, v.business_id, true, v.texto, left(p_mensagem_id, 200),
            case when v.aquecimento then 'aquecimento' else 'disparo' end, true)
    on conflict (chip_id, mensagem_id) where mensagem_id is not null
    do update set origem = excluded.origem;

    if not v.aquecimento then
      insert into public.whatsapp_conversas (owner_id, numero, chip_id, business_id, ultima_saida_em)
      values (v.owner_id, v.numero, v.chip_id, v.business_id, now())
      on conflict (owner_id, numero) do update
      set chip_id = excluded.chip_id,
          business_id = coalesce(public.whatsapp_conversas.business_id, excluded.business_id),
          ultima_saida_em = now(),
          updated_at = now();
    end if;

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

-- ---------- o que entra passa a acordar o robô ----------
create or replace function public.whatsapp_receber(p_token uuid, p_evento jsonb)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  c public.whatsapp_chips;
  conv public.whatsapp_conversas;
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
    (owner_id, chip_id, numero, business_id, de_mim, texto, tipo, nome_contacto, mensagem_id, enviada_em, lida)
  values (
    c.owner_id, c.id, v_numero, v_negocio, v_de_mim, left(v_texto, 4000),
    coalesce(d ->> 'messageType', 'texto'),
    case when v_de_mim then null else left(d ->> 'pushName', 120) end,
    left(d -> 'key' ->> 'id', 200), v_quando, v_de_mim
  )
  on conflict do nothing;

  if v_de_mim then
    return 'minha';
  end if;

  update public.whatsapp_envios
  set respondeu_em = coalesce(respondeu_em, v_quando)
  where owner_id = c.owner_id and numero = v_numero and estado = 'enviado';

  insert into public.whatsapp_conversas (owner_id, numero, chip_id, business_id, ultima_entrada_em)
  values (c.owner_id, v_numero, c.id, v_negocio, v_quando)
  on conflict (owner_id, numero) do update
  set chip_id = excluded.chip_id,
      business_id = coalesce(public.whatsapp_conversas.business_id, excluded.business_id),
      ultima_entrada_em = excluded.ultima_entrada_em,
      -- Respondeu: o seguimento que estava à espera já não faz sentido.
      seguimento_em = null,
      updated_at = now()
  returning * into conv;

  palavra := upper(regexp_replace(coalesce(v_texto, ''), '[^[:alpha:]]', '', 'g'));
  if palavra in ('SAIR', 'PARAR', 'STOP', 'CANCELAR', 'REMOVER', 'DESCADASTRAR') then
    insert into public.nao_contactar (owner_id, business_id, telefone, motivo)
    values (c.owner_id, v_negocio, v_numero, 'respondeu ' || palavra || ' no WhatsApp')
    on conflict do nothing;

    update public.whatsapp_envios set estado = 'cancelado', erro = 'pediu para sair'
    where owner_id = c.owner_id and numero = v_numero and estado = 'pendente';

    update public.whatsapp_conversas set robo_ativo = false, responder_em = null, seguimento_em = null
    where id = conv.id;
    return 'saiu';
  end if;

  if public.whatsapp_robo_pode(conv) then
    update public.whatsapp_conversas set responder_em = now() + interval '25 seconds'
    where id = conv.id;
    return 'robo';
  end if;

  return 'mensagem';
end;
$$;

-- ---------- o motor também acorda para o robô ----------
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
  update public.whatsapp_envios
  set estado = 'falhou', erro = 'sem confirmação do envio'
  where estado = 'a_enviar' and tentado_em < now() - interval '15 minutes';

  update public.whatsapp_campanhas k
  set estado = 'terminada', terminada_em = now(), updated_at = now()
  where k.estado = 'a_correr'
    and k.tipo = 'disparo'
    and not exists (
      select 1 from public.whatsapp_envios e
      where e.campanha_id = k.id and e.estado in ('pendente', 'a_enviar')
    );

  -- Uma resposta do robô que ficou a meio há mais de 5 minutos volta à fila.
  update public.whatsapp_conversas
  set a_responder_desde = null, responder_em = coalesce(responder_em, now())
  where a_responder_desde < now() - interval '5 minutes';

  ha_trabalho := exists (
    select 1 from public.whatsapp_conversas v
    where (v.responder_em <= now() or (v.seguimento_em <= now() and not v.seguimento_feito))
      and v.a_responder_desde is null
  );

  if not ha_trabalho then
    for c in select * from public.whatsapp_chips_prontos() loop
      if (public.whatsapp_proximo_para(c)).id is not null then
        ha_trabalho := true;
        exit;
      end if;
    end loop;
  end if;
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

-- ---------- o robô pede trabalho ----------
-- No máximo 5 conversas por volta (cada uma é uma chamada à IA, e a rota tem
-- 60 s). Devolve tudo o que a IA precisa num `contexto`: a configuração, o
-- lead e as últimas 30 mensagens.
create or replace function public.whatsapp_reclamar_robo(p_token uuid)
returns table (conversa_id uuid, numero text, instancia text, pais text, tipo text, contexto jsonb)
language plpgsql
security definer
set search_path = public
as $$
#variable_conflict use_column
declare
  v public.whatsapp_conversas;
  r public.whatsapp_robo;
  ch public.whatsapp_chips;
  v_pais text;
  v_tipo text;
  feitos integer := 0;
begin
  if not exists (select 1 from public.whatsapp_sistema where token_do_motor = p_token) then
    return;
  end if;

  for v in
    select * from public.whatsapp_conversas w
    where w.a_responder_desde is null
      and (w.responder_em <= now() or (w.seguimento_em <= now() and not w.seguimento_feito))
    order by coalesce(w.responder_em, w.seguimento_em)
    for update skip locked
  loop
    exit when feitos >= 5;
    v_tipo := case when v.responder_em is not null and v.responder_em <= now() then 'resposta' else 'seguimento' end;
    v_pais := case when v.numero like '55%' then 'BR' else 'PT' end;

    -- Uma pessoa entrou na conversa: o robô cala-se nesta conversa.
    if public.whatsapp_humano_escreveu(v) then
      update public.whatsapp_conversas
      set humano_desde = now(), responder_em = null, seguimento_em = null, updated_at = now()
      where id = v.id;
      continue;
    end if;

    if not public.whatsapp_robo_pode(v) then
      update public.whatsapp_conversas set responder_em = null, seguimento_em = null where id = v.id;
      continue;
    end if;

    select * into r from public.whatsapp_robo where owner_id = v.owner_id;
    -- Fora de horas de quem recebe: fica para quando for hora (não se apaga).
    if public.whatsapp_hora_local(v_pais) < r.hora_inicio or public.whatsapp_hora_local(v_pais) >= r.hora_fim then
      continue;
    end if;

    -- O seguimento só se a última palavra foi nossa.
    if v_tipo = 'seguimento' and coalesce(v.ultima_entrada_em, '-infinity') > coalesce(v.ultima_saida_em, '-infinity') then
      update public.whatsapp_conversas set seguimento_em = null where id = v.id;
      continue;
    end if;

    select * into ch from public.whatsapp_chips
    where id = v.chip_id and estado = 'ligado' and ativo and travado_motivo is null;
    if not found then
      continue;
    end if;

    update public.whatsapp_conversas
    set a_responder_desde = now(), responder_em = null, updated_at = now()
    where id = v.id;

    conversa_id := v.id;
    numero := v.numero;
    instancia := ch.instancia;
    pais := v_pais;
    tipo := v_tipo;
    contexto := jsonb_build_object(
      'robo', jsonb_build_object(
        'modelo', r.modelo, 'sobre', r.sobre, 'objetivo', r.objetivo, 'regras', r.regras,
        'max_respostas', r.max_respostas
      ),
      'respostas_robo', v.respostas_robo,
      'lead', (
        select jsonb_build_object(
          'nome', b.name, 'ramo', b.business_category, 'cidade', b.locality,
          'pais', b.country_code, 'site', b.website_kind
        )
        from public.businesses b where b.id = v.business_id
      ),
      'nome_whatsapp', (
        select m.nome_contacto from public.whatsapp_mensagens m
        where m.owner_id = v.owner_id and m.numero = v.numero and m.nome_contacto is not null
        order by m.enviada_em desc limit 1
      ),
      'mensagens', coalesce((
        select jsonb_agg(jsonb_build_object('de_mim', x.de_mim, 'texto', x.texto, 'tipo', x.tipo) order by x.enviada_em)
        from (
          select m.de_mim, m.texto, m.tipo, m.enviada_em from public.whatsapp_mensagens m
          where m.owner_id = v.owner_id and m.numero = v.numero
          order by m.enviada_em desc limit 30
        ) x
      ), '[]'::jsonb)
    );
    feitos := feitos + 1;
    return next;
  end loop;
end;
$$;

-- ---------- o robô diz o que fez ----------
create or replace function public.whatsapp_robo_resultado(
  p_token uuid,
  p_conversa uuid,
  p_tipo text,
  p_texto text default null,
  p_mensagem_id text default null,
  p_quente boolean default false,
  p_humano boolean default false,
  p_sair boolean default false,
  p_motivo text default null
)
returns table (avisar boolean, avisar_numero text, instancia text, numero text, nome text)
language plpgsql
security definer
set search_path = public
as $$
#variable_conflict use_column
declare
  v public.whatsapp_conversas;
  r public.whatsapp_robo;
  ja_quente boolean;
  ja_humano boolean;
begin
  if not exists (select 1 from public.whatsapp_sistema where token_do_motor = p_token) then
    return;
  end if;
  select * into v from public.whatsapp_conversas where id = p_conversa for update;
  if not found then
    return;
  end if;
  select * into r from public.whatsapp_robo where owner_id = v.owner_id;
  ja_quente := v.quente;
  ja_humano := v.humano_desde is not null;

  if p_texto is not null and length(trim(p_texto)) > 0 then
    insert into public.whatsapp_mensagens
      (owner_id, chip_id, numero, business_id, de_mim, texto, mensagem_id, origem, lida)
    values (v.owner_id, v.chip_id, v.numero, v.business_id, true, left(p_texto, 4000),
            left(p_mensagem_id, 200), 'robo', true)
    on conflict (chip_id, mensagem_id) where mensagem_id is not null
    do update set origem = 'robo';
  end if;

  update public.whatsapp_conversas
  set a_responder_desde = null,
      respostas_robo = respostas_robo + case when p_texto is not null then 1 else 0 end,
      ultima_saida_em = case when p_texto is not null then now() else ultima_saida_em end,
      seguimento_feito = seguimento_feito or p_tipo = 'seguimento',
      seguimento_em = case
        when p_tipo = 'seguimento' or p_humano or p_sair or not coalesce(r.seguimento, false) or seguimento_feito then null
        when p_texto is not null then now() + make_interval(hours => r.seguimento_horas)
        else seguimento_em
      end,
      quente = quente or p_quente,
      quente_em = case when p_quente and not quente then now() else quente_em end,
      motivo = coalesce(nullif(left(p_motivo, 300), ''), motivo),
      humano_desde = case when p_humano then coalesce(humano_desde, now()) else humano_desde end,
      robo_ativo = robo_ativo and not p_sair,
      updated_at = now()
  where id = v.id;

  if p_sair then
    insert into public.nao_contactar (owner_id, business_id, telefone, motivo)
    values (v.owner_id, v.business_id, v.numero, 'pediu para sair (percebido pelo robô)')
    on conflict do nothing;
    update public.whatsapp_envios set estado = 'cancelado', erro = 'pediu para sair'
    where owner_id = v.owner_id and numero = v.numero and estado = 'pendente';
  end if;

  -- Lead quente ou pedido de humano: sobe para o topo de «Leads a contactar».
  if (p_quente and not ja_quente) or (p_humano and not ja_humano) then
    if v.business_id is not null then
      insert into public.deals (owner_id, business_id, next_action, next_action_at)
      values (v.owner_id, v.business_id,
              left('WhatsApp: ' || coalesce(nullif(p_motivo, ''), 'lead quente — responder já'), 300), now())
      on conflict (owner_id, business_id) do update
      set next_action = excluded.next_action, next_action_at = excluded.next_action_at;
    end if;

    avisar := r.avisar_numero is not null;
    avisar_numero := r.avisar_numero;
    instancia := (select ch.instancia from public.whatsapp_chips ch where ch.id = v.chip_id);
    numero := v.numero;
    nome := coalesce(
      (select b.name from public.businesses b where b.id = v.business_id),
      (select m.nome_contacto from public.whatsapp_mensagens m
       where m.owner_id = v.owner_id and m.numero = v.numero and m.nome_contacto is not null
       order by m.enviada_em desc limit 1)
    );
    return next;
  end if;
end;
$$;

revoke all on function public.whatsapp_robo_pode(public.whatsapp_conversas) from public;
revoke all on function public.whatsapp_humano_escreveu(public.whatsapp_conversas) from public;
revoke all on function public.whatsapp_reclamar_robo(uuid) from public;
revoke all on function public.whatsapp_robo_resultado(uuid, uuid, text, text, text, boolean, boolean, boolean, text) from public;
revoke execute on function public.whatsapp_robo_pode(public.whatsapp_conversas) from anon, authenticated;
revoke execute on function public.whatsapp_humano_escreveu(public.whatsapp_conversas) from anon, authenticated;
revoke execute on function public.whatsapp_chamar_motor() from anon, authenticated;
grant execute on function public.whatsapp_reclamar_robo(uuid) to anon, authenticated;
grant execute on function public.whatsapp_robo_resultado(uuid, uuid, text, text, text, boolean, boolean, boolean, text) to anon, authenticated;
