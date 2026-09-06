-- ============================================================================
-- 0006 — Visitas, cliques e relatório mensal
--
-- Duas tabelas de eventos em bruto e uma vista que as agrega por mês. Guardar
-- o evento cru e agregar na leitura permite mudar a forma do relatório depois
-- sem perder dados — ao contrário de guardar só contadores.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- site_visits
--
-- `business_id` está desnormalizado de propósito: o relatório mensal agrupa por
-- comércio e assim evita um join a `generated_sites` em cada leitura.
--
-- Nota de privacidade: guarda-se `visitor_hash` (hash de IP + user agent + sal
-- diário), nunca o IP. Chega para contar visitantes distintos e não é um dado
-- pessoal guardado em claro.
-- ----------------------------------------------------------------------------
create table public.site_visits (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null
    references auth.users (id) on delete cascade,
  site_id uuid not null
    references public.generated_sites (id) on delete cascade,
  business_id uuid
    references public.businesses (id) on delete set null,

  visited_at timestamptz not null default now(),

  visitor_hash text,      -- hash, nunca o IP
  session_id text,        -- agrupa cliques na mesma visita
  is_first_visit boolean not null default false,

  referrer text,
  utm_source text,
  utm_medium text,
  utm_campaign text,

  device_type text check (device_type is null or device_type in ('mobile', 'tablet', 'desktop', 'bot', 'unknown')),
  user_agent text,
  country_code text check (country_code is null or country_code ~ '^[A-Z]{2}$'),
  city text,

  created_at timestamptz not null default now()
);

comment on table public.site_visits is
  'Visitas às landing pages públicas. Base dos relatórios mensais.';
comment on column public.site_visits.visitor_hash is
  'Hash do visitante para contagem de únicos. Nunca guardar o IP em claro.';

create index site_visits_site_visited_idx on public.site_visits (site_id, visited_at desc);
create index site_visits_owner_visited_idx on public.site_visits (owner_id, visited_at desc);
create index site_visits_business_visited_idx
  on public.site_visits (business_id, visited_at desc);
-- Sem índice sobre date_trunc('month', ...): a função é STABLE e não IMMUTABLE
-- (o resultado depende do fuso da sessão), portanto não é indexável. O relatório
-- mensal filtra um intervalo de datas e usa site_visits_owner_visited_idx.

-- ----------------------------------------------------------------------------
-- site_clicks
-- ----------------------------------------------------------------------------
create table public.site_clicks (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null
    references auth.users (id) on delete cascade,
  site_id uuid not null
    references public.generated_sites (id) on delete cascade,
  business_id uuid
    references public.businesses (id) on delete set null,
  -- Preenchido quando o clique foi num prato do cardápio.
  menu_item_id uuid references public.menu_items (id) on delete set null,
  -- Liga o clique à visita que o originou, quando se conhece.
  visit_id uuid references public.site_visits (id) on delete set null,

  target public.click_target not null,
  target_value text,        -- número marcado, URL aberto, ...
  clicked_at timestamptz not null default now(),

  session_id text,
  visitor_hash text,

  created_at timestamptz not null default now()
);

comment on table public.site_clicks is
  'Cliques nas landing pages (WhatsApp, telefone, cardápio, ...).';

create index site_clicks_site_clicked_idx on public.site_clicks (site_id, clicked_at desc);
create index site_clicks_owner_clicked_idx on public.site_clicks (owner_id, clicked_at desc);
create index site_clicks_target_idx on public.site_clicks (owner_id, target, clicked_at desc);
create index site_clicks_business_clicked_idx
  on public.site_clicks (business_id, clicked_at desc);
create index site_clicks_menu_item_idx
  on public.site_clicks (menu_item_id) where menu_item_id is not null;
-- Ver a nota em site_visits: o agrupamento mensal apoia-se em
-- site_clicks_owner_clicked_idx sobre o intervalo de datas.

-- ----------------------------------------------------------------------------
-- monthly_site_report — o relatório mensal
--
-- `security_invoker = on` faz a vista correr com os direitos de quem consulta,
-- portanto a RLS das tabelas de baixo aplica-se. Sem isto, a vista devolveria
-- os dados de todos os donos.
-- ----------------------------------------------------------------------------
create view public.monthly_site_report
with (security_invoker = on)
as
with visits as (
  select
    v.owner_id,
    v.site_id,
    date_trunc('month', v.visited_at) as month,
    count(*) as visits,
    count(distinct v.visitor_hash) filter (where v.visitor_hash is not null) as unique_visitors,
    count(distinct v.session_id) filter (where v.session_id is not null) as sessions
  from public.site_visits v
  group by v.owner_id, v.site_id, date_trunc('month', v.visited_at)
),
clicks as (
  select
    c.owner_id,
    c.site_id,
    date_trunc('month', c.clicked_at) as month,
    count(*) as clicks,
    count(*) filter (where c.target = 'whatsapp') as whatsapp_clicks,
    count(*) filter (where c.target = 'phone') as phone_clicks,
    count(*) filter (where c.target = 'menu_item') as menu_item_clicks,
    count(*) filter (where c.target = 'directions') as directions_clicks
  from public.site_clicks c
  group by c.owner_id, c.site_id, date_trunc('month', c.clicked_at)
)
select
  coalesce(v.owner_id, c.owner_id) as owner_id,
  coalesce(v.site_id, c.site_id) as site_id,
  s.business_id,
  b.name as business_name,
  s.public_code,
  s.template,
  coalesce(v.month, c.month) as month,
  coalesce(v.visits, 0) as visits,
  coalesce(v.unique_visitors, 0) as unique_visitors,
  coalesce(v.sessions, 0) as sessions,
  coalesce(c.clicks, 0) as clicks,
  coalesce(c.whatsapp_clicks, 0) as whatsapp_clicks,
  coalesce(c.phone_clicks, 0) as phone_clicks,
  coalesce(c.menu_item_clicks, 0) as menu_item_clicks,
  coalesce(c.directions_clicks, 0) as directions_clicks,
  case
    when coalesce(v.visits, 0) = 0 then 0
    else round(coalesce(c.clicks, 0)::numeric * 100 / v.visits, 2)
  end as click_through_rate
from visits v
full outer join clicks c
  on  v.owner_id = c.owner_id
  and v.site_id  = c.site_id
  and v.month    = c.month
left join public.generated_sites s on s.id = coalesce(v.site_id, c.site_id)
left join public.businesses b on b.id = s.business_id;

comment on view public.monthly_site_report is
  'Visitas e cliques agregados por site e por mês. Respeita a RLS (security_invoker).';
