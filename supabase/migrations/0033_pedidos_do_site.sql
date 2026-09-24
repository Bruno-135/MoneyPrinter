-- ---------------------------------------------------------------------------
-- 0033 — os pedidos que chegam pelo formulário do site
--
-- Até aqui todo o trabalho vinha de fora para dentro: varre-se o Google, e vai
-- daí o contacto. Isto é o contrário — é alguém que nos procurou. Vale mais do
-- que qualquer contacto frio e não pode cair numa caixa de correio entre a
-- factura da luz e uma newsletter.
--
-- Daí a tabela, e não um email: o pedido fica com estado, entra no painel, e
-- continua lá amanhã de manhã.
--
-- QUEM ESCREVE. O formulário é público e quem o preenche não tem sessão. Não
-- se abre a tabela ao anónimo — abre-se UMA função, que valida e escreve. A
-- diferença é que pela função só entra o que ela deixa entrar, e ninguém pode
-- ler nem apagar o que lá está.
-- ---------------------------------------------------------------------------

create table public.pedidos (
  id uuid primary key default gen_random_uuid(),

  -- O dono. Não vem de `auth.uid()` porque quem insere não tem sessão: é a
  -- função que o resolve.
  owner_id uuid not null references auth.users (id) on delete cascade,

  -- Os três campos obrigatórios do desenho.
  negocio text not null check (length(trim(negocio)) > 0),
  contacto text not null check (length(trim(contacto)) > 0),
  pedido text not null check (length(trim(pedido)) > 0),

  -- Os dois opcionais.
  modelo text,
  prazo text,

  -- Onde é que o pedido está. `novo` até alguém lhe pegar.
  estado text not null default 'novo'
    check (estado in ('novo', 'respondido', 'ganho', 'perdido')),

  -- O que se apurou depois, em conversa. Fica ao lado do pedido e não numa
  -- conversa de WhatsApp.
  notas text,

  -- Por onde chegou. Hoje é sempre o formulário; amanhã pode ser outro sítio,
  -- e a pergunta "de onde vêm os clientes que fecham" precisa desta coluna.
  origem text not null default 'formulario',

  -- Para o dia em que isto virar cliente: liga-se à ficha do comércio.
  business_id uuid references public.businesses (id) on delete set null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index pedidos_por_dono_idx on public.pedidos (owner_id, created_at desc);
create index pedidos_por_estado_idx on public.pedidos (owner_id, estado, created_at desc);

create trigger pedidos_set_updated_at
  before update on public.pedidos
  for each row execute function public.set_updated_at();

alter table public.pedidos enable row level security;

-- O dono vê e mexe no que é dele. Mais ninguém lê isto: um pedido traz o
-- telefone de uma pessoa.
create policy pedidos_owner_all on public.pedidos
  for all
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Quem recebe os pedidos do site.
--
-- Enquanto a agência for uma pessoa, é a primeira conta criada. Fica numa
-- função em vez de espalhado por três sítios: no dia em que houver equipa,
-- muda-se aqui e mais nada.
-- ---------------------------------------------------------------------------
create or replace function public.dono_da_agencia()
returns uuid
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select id from auth.users order by created_at asc limit 1;
$$;

-- ---------------------------------------------------------------------------
-- A porta por onde entra um pedido do site.
--
-- `security definer` porque quem chama não tem sessão. Em troca, a função é
-- estreita de propósito: recebe cinco textos, corta-os ao tamanho, e escreve
-- uma linha. Não lê nada, não apaga nada, não devolve nada além do id.
--
-- Os limites de tamanho não são decoração: sem eles, um robô com um script
-- enche a base de dados com um pedido de dez megabytes.
-- ---------------------------------------------------------------------------
create or replace function public.registar_pedido(
  p_negocio text,
  p_contacto text,
  p_pedido text,
  p_modelo text default null,
  p_prazo text default null
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_dono uuid;
  v_id uuid;
begin
  v_dono := public.dono_da_agencia();
  if v_dono is null then
    raise exception 'não há dono a quem entregar o pedido';
  end if;

  if coalesce(trim(p_negocio), '') = ''
     or coalesce(trim(p_contacto), '') = ''
     or coalesce(trim(p_pedido), '') = '' then
    raise exception 'faltam campos obrigatórios';
  end if;

  insert into public.pedidos (owner_id, negocio, contacto, pedido, modelo, prazo)
  values (
    v_dono,
    left(trim(p_negocio), 200),
    left(trim(p_contacto), 200),
    left(trim(p_pedido), 4000),
    left(nullif(trim(coalesce(p_modelo, '')), ''), 100),
    left(nullif(trim(coalesce(p_prazo, '')), ''), 200)
  )
  returning id into v_id;

  return v_id;
end;
$$;

-- Quem chega pelo site não tem sessão: é o papel `anon`. É a ÚNICA coisa que
-- ele pode fazer nesta tabela.
revoke all on function public.registar_pedido(text, text, text, text, text) from public;
grant execute on function public.registar_pedido(text, text, text, text, text) to anon, authenticated;

revoke all on function public.dono_da_agencia() from public;
grant execute on function public.dono_da_agencia() to authenticated;

comment on table public.pedidos is
  'Pedidos chegados pelo formulário do vaidesign.net. Escritos por registar_pedido(), lidos só pelo dono.';
