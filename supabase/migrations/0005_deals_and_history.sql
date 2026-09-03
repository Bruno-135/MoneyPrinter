-- ============================================================================
-- 0005 — Estado da negociação e histórico
--
--   deals             -> estado ATUAL, um por comércio
--   deal_stage_events -> histórico completo, escrito por trigger
--
-- O histórico não é escrito pela aplicação. Se fosse, bastava um caminho de
-- código esquecer-se para o histórico ficar com buracos; com trigger, qualquer
-- mudança de estado fica registada, venha de onde vier.
-- ============================================================================

create table public.deals (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid()
    references auth.users (id) on delete cascade,
  business_id uuid not null
    references public.businesses (id) on delete cascade,

  stage public.deal_stage not null default 'new',
  stage_changed_at timestamptz not null default now(),

  -- Valor esperado, em cêntimos + moeda (EUR em PT, BRL em BR).
  expected_value_cents integer check (expected_value_cents >= 0),
  currency text not null default 'EUR' check (currency ~ '^[A-Z]{3}$'),
  probability smallint check (probability between 0 and 100),

  -- Próximo passo, para a lista de trabalho do dia.
  next_action text,
  next_action_at timestamptz,

  first_contacted_at timestamptz,
  last_contacted_at timestamptz,
  won_at timestamptz,
  lost_at timestamptz,
  lost_reason text,

  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- Uma negociação por comércio.
  constraint deals_owner_business_unique unique (owner_id, business_id),
  constraint deals_won_has_date check (stage <> 'won' or won_at is not null),
  constraint deals_lost_has_date check (stage <> 'lost' or lost_at is not null)
);

comment on table public.deals is 'Estado atual da negociação de cada comércio.';
comment on column public.deals.stage_changed_at is
  'Quando o estado mudou pela última vez. Escrito por trigger.';

create index deals_owner_stage_idx on public.deals (owner_id, stage, stage_changed_at desc);
create index deals_owner_next_action_idx
  on public.deals (owner_id, next_action_at) where next_action_at is not null;
create index deals_business_idx on public.deals (business_id);

create trigger deals_set_updated_at
  before update on public.deals
  for each row execute function public.set_updated_at();

-- ----------------------------------------------------------------------------
-- deal_stage_events — histórico, só de inserção
-- ----------------------------------------------------------------------------
create table public.deal_stage_events (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid()
    references auth.users (id) on delete cascade,
  deal_id uuid not null
    references public.deals (id) on delete cascade,
  business_id uuid not null
    references public.businesses (id) on delete cascade,

  from_stage public.deal_stage,   -- null na criação da negociação
  to_stage public.deal_stage not null,

  changed_at timestamptz not null default now(),
  changed_by uuid references auth.users (id) on delete set null,
  note text,

  created_at timestamptz not null default now(),

  constraint deal_stage_events_actually_changed check (from_stage is distinct from to_stage)
);

comment on table public.deal_stage_events is
  'Histórico de mudanças de estado. Escrito por trigger; não inserir à mão.';

create index deal_stage_events_deal_changed_idx
  on public.deal_stage_events (deal_id, changed_at desc);
create index deal_stage_events_owner_changed_idx
  on public.deal_stage_events (owner_id, changed_at desc);
create index deal_stage_events_business_idx on public.deal_stage_events (business_id);

-- ----------------------------------------------------------------------------
-- Triggers
-- ----------------------------------------------------------------------------

-- BEFORE: mantém coerentes as datas que dependem do estado.
create or replace function public.sync_deal_stage_dates()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' and new.stage is distinct from old.stage then
    new.stage_changed_at := now();

    if new.stage = 'won' and new.won_at is null then
      new.won_at := now();
    end if;

    if new.stage = 'lost' and new.lost_at is null then
      new.lost_at := now();
    end if;

    -- Reaberta: limpar o desfecho anterior para não ficar histórico contraditório.
    if new.stage not in ('won', 'lost') then
      new.won_at := null;
      new.lost_at := null;
      new.lost_reason := null;
    end if;

    if new.stage <> 'new' and new.first_contacted_at is null then
      new.first_contacted_at := now();
    end if;
  end if;

  if tg_op = 'INSERT' then
    if new.stage = 'won' and new.won_at is null then
      new.won_at := now();
    end if;
    if new.stage = 'lost' and new.lost_at is null then
      new.lost_at := now();
    end if;
  end if;

  return new;
end;
$$;

create trigger deals_sync_stage_dates
  before insert or update on public.deals
  for each row execute function public.sync_deal_stage_dates();

-- AFTER: grava o histórico.
--
-- SECURITY DEFINER de propósito: `deal_stage_events` não tem política de INSERT
-- para ninguém, portanto o histórico só pode ser escrito por este trigger.
-- Ninguém consegue forjar ou apagar uma entrada do histórico pela API.
create or replace function public.log_deal_stage_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.deal_stage_events
      (owner_id, deal_id, business_id, from_stage, to_stage, changed_at, changed_by)
    values
      (new.owner_id, new.id, new.business_id, null, new.stage, new.stage_changed_at, auth.uid());

  elsif new.stage is distinct from old.stage then
    insert into public.deal_stage_events
      (owner_id, deal_id, business_id, from_stage, to_stage, changed_at, changed_by)
    values
      (new.owner_id, new.id, new.business_id, old.stage, new.stage, new.stage_changed_at, auth.uid());
  end if;

  return null;
end;
$$;

create trigger deals_log_stage_change
  after insert or update of stage on public.deals
  for each row execute function public.log_deal_stage_change();
