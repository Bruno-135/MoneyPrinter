-- ---------------------------------------------------------------------------
-- 0025 — o que já se vendeu a cada cliente, serviço a serviço
--
-- Há dois dias a venda entrou como duas colunas em `deals`:
-- `sale_value_cents` e `sale_is_monthly`. Serviu enquanto havia uma coisa a
-- vender. Deixou de servir no momento em que passaram a existir sete — site,
-- ficha do Google, avaliações, Instagram, cardápio, domínio, fotografia.
--
-- Com uma coluna só, "vendeu-se 80 euros" não diz o que foi vendido, e não há
-- como responder à pergunta que se faz todos os dias: quem é que já tem site
-- mas ainda não tem cardápio?
--
-- Aqui uma linha é um serviço vendido a um cliente. A soma dá a faturação, a
-- ausência dá a oportunidade.
--
-- As duas colunas de `deals` saem na mesma migração. Não há uma única linha
-- preenchida (confirmado antes de escrever isto), portanto não se perde nada —
-- e deixá-las era ficar com dois sítios a guardar dinheiro, que mais cedo ou
-- mais tarde discordam.
--
-- `deals` fica a ser o funil: em que pé está a conversa. `client_services`
-- passa a ser a conta: o que ele paga. São perguntas diferentes.
--
-- `cancelled_at` em vez de apagar: um cliente que cancela a avença deixa de
-- contar para o que se recebe este mês, mas continua a fazer parte da
-- história. Apagar a linha era perder a informação de que ele já foi cliente,
-- que é precisamente quem é mais fácil de recuperar.
-- ---------------------------------------------------------------------------

create table public.client_services (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid()
    references auth.users (id) on delete cascade,
  business_id uuid not null
    references public.businesses (id) on delete cascade,

  -- O slug do catálogo em `src/lib/servicos/catalogo.ts`. Texto e não enum:
  -- acrescentar um serviço novo é editar uma lista em TypeScript, e não vale
  -- uma migração de cada vez que se inventa uma oferta.
  service_slug text not null
    check (service_slug ~ '^[a-z][a-z0-9-]{1,40}$'),

  -- Em cêntimos, como em todo o lado. Null = vendeu-se sem registar o valor,
  -- que é diferente de ter sido de graça.
  value_cents integer check (value_cents is null or value_cents >= 0),
  is_monthly boolean not null default false,
  currency text not null default 'EUR' check (currency ~ '^[A-Z]{3}$'),

  sold_at timestamptz not null default now(),
  cancelled_at timestamptz,
  notes text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- Um serviço vende-se uma vez a cada cliente. Vender o mesmo duas vezes é
  -- um engano de quem carregou no botão, não um caso a suportar.
  constraint client_services_one_per_business unique (business_id, service_slug),
  constraint client_services_cancel_after_sale
    check (cancelled_at is null or cancelled_at >= sold_at)
);

comment on table public.client_services is
  'O que cada cliente comprou, servico a servico. A soma da a faturacao; a ausencia da a oportunidade.';
comment on column public.client_services.cancelled_at is
  'Cancelado nesta data. Nao se apaga a linha: quem ja foi cliente e quem e mais facil de recuperar.';

create index client_services_owner_business_idx
  on public.client_services (owner_id, business_id);

-- Para a lista de clientes e para as contas do mês: só o que está activo.
create index client_services_ativos_idx
  on public.client_services (owner_id, service_slug)
  where cancelled_at is null;

create trigger client_services_set_updated_at
  before update on public.client_services
  for each row execute function public.set_updated_at();

alter table public.client_services enable row level security;

create policy "client services: owner reads" on public.client_services
  for select to authenticated using (owner_id = (select public.current_owner_id()));
create policy "client services: owner inserts" on public.client_services
  for insert to authenticated with check (owner_id = (select public.current_owner_id()));
create policy "client services: owner updates" on public.client_services
  for update to authenticated
  using (owner_id = (select public.current_owner_id()))
  with check (owner_id = (select public.current_owner_id()));
create policy "client services: owner deletes" on public.client_services
  for delete to authenticated using (owner_id = (select public.current_owner_id()));

-- ---------------------------------------------------------------------------
-- As colunas que isto substitui. Zero linhas preenchidas, verificado antes.
-- ---------------------------------------------------------------------------
alter table public.deals
  drop column if exists sale_value_cents,
  drop column if exists sale_is_monthly;
