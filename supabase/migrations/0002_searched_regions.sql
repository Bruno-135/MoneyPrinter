-- ============================================================================
-- 0002 — Regiões pesquisadas e chamadas ao Google Places
--
-- Objetivo destas duas tabelas: NUNCA repetir uma consulta paga.
--   searched_regions -> uma linha por combinação zona+ramo, com a data da busca
--   region_searches  -> uma linha por chamada HTTP, com a resposta em bruto
-- ============================================================================

-- ----------------------------------------------------------------------------
-- searched_regions — a cache: "esta zona, este ramo, já procurei quando?"
-- ----------------------------------------------------------------------------
create table public.searched_regions (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid()
    references auth.users (id) on delete cascade,

  -- Nome dado pelo utilizador. Ex.: "Braga centro", "Porto - Cedofeita".
  label text not null check (btrim(label) <> ''),

  -- Ramo de negócio procurado. Ex.: "restaurante", "cabeleireiro".
  business_category text not null check (btrim(business_category) <> ''),

  -- Localização, em campos separados por causa das diferenças PT/BR.
  country_code text not null check (country_code ~ '^[A-Z]{2}$'),
  locality text,          -- concelho / cidade / município
  admin_area text,        -- distrito (PT) / estado (BR)
  postal_code text,

  center_lat numeric(9, 6) check (center_lat between -90 and 90),
  center_lng numeric(9, 6) check (center_lng between -180 and 180),
  radius_meters integer check (radius_meters between 1 and 50000),

  -- Texto exato mandado ao Places, guardado para se poder reproduzir a busca.
  search_query text,

  -- Chave de deduplicação, calculada pela base de dados para que a aplicação
  -- não possa criar duas linhas "iguais" só por diferenças de maiúsculas,
  -- espaços ou casas decimais. Coordenadas arredondadas a 4 casas (~11 m).
  search_key text generated always as (
    lower(country_code)
      || '|' || coalesce(lower(btrim(locality)), '')
      || '|' || coalesce(round(center_lat, 4)::text, '')
      || '|' || coalesce(round(center_lng, 4)::text, '')
      || '|' || coalesce(radius_meters::text, '')
      || '|' || lower(btrim(business_category))
  ) stored,

  -- Datas da busca. `last_searched_at` é o que decide se vale a pena repetir.
  first_searched_at timestamptz not null default now(),
  last_searched_at timestamptz not null default now(),
  search_count integer not null default 0 check (search_count >= 0),

  -- Resultado acumulado.
  places_found integer not null default 0 check (places_found >= 0),
  new_places_last_search integer not null default 0 check (new_places_last_search >= 0),

  -- Paginação do Places. Com token, ainda há páginas por ir buscar.
  next_page_token text,
  is_exhausted boolean not null default false,

  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- A regra anti-desperdício, imposta pelo schema e não pelo código.
  constraint searched_regions_owner_key_unique unique (owner_id, search_key)
);

comment on table public.searched_regions is
  'Zonas + ramos já pesquisados no Google Places. Consultar antes de chamar a API.';
comment on column public.searched_regions.search_key is
  'Chave de dedup normalizada. Gerada pela BD; não escrever à mão.';
comment on column public.searched_regions.last_searched_at is
  'Data da última busca. Base da decisão de repetir ou não a consulta.';

create index searched_regions_owner_last_searched_idx
  on public.searched_regions (owner_id, last_searched_at desc);
create index searched_regions_owner_category_idx
  on public.searched_regions (owner_id, business_category);
create index searched_regions_country_locality_idx
  on public.searched_regions (country_code, locality);

create trigger searched_regions_set_updated_at
  before update on public.searched_regions
  for each row execute function public.set_updated_at();

-- ----------------------------------------------------------------------------
-- region_searches — o registo em bruto de cada chamada à API
--
-- Guardar a resposta completa significa que uma mudança no cálculo do score,
-- ou um campo novo que se queira mostrar, se resolve reprocessando o JSON que
-- já cá está — sem gastar um único pedido novo.
-- ----------------------------------------------------------------------------
create table public.region_searches (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid()
    references auth.users (id) on delete cascade,
  region_id uuid not null
    references public.searched_regions (id) on delete cascade,

  provider text not null default 'google_places',
  endpoint text not null,                       -- ex.: 'places:searchNearby'
  request_params jsonb not null default '{}'::jsonb,

  -- Resposta completa, tal e qual como veio. Nunca truncar.
  response_raw jsonb not null default '{}'::jsonb,

  http_status integer,
  results_count integer not null default 0 check (results_count >= 0),
  page_token text,          -- token usado nesta chamada (null na 1.ª página)
  next_page_token text,     -- token devolvido por esta chamada
  error_message text,

  requested_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

comment on table public.region_searches is
  'Uma linha por chamada ao Google Places, com a resposta em bruto para reprocessamento.';
comment on column public.region_searches.response_raw is
  'Resposta completa da API. Fonte para reprocessar sem gastar quota.';

create index region_searches_region_requested_idx
  on public.region_searches (region_id, requested_at desc);
create index region_searches_owner_requested_idx
  on public.region_searches (owner_id, requested_at desc);

-- ----------------------------------------------------------------------------
-- Verificação de frescura da cache
-- ----------------------------------------------------------------------------
create or replace function public.is_region_search_stale(
  p_region_id uuid,
  p_max_age_days integer default 30
)
returns boolean
language sql
stable
set search_path = ''
as $$
  select coalesce(
    (
      select r.last_searched_at < now() - make_interval(days => p_max_age_days)
      from public.searched_regions r
      where r.id = p_region_id
    ),
    true   -- região desconhecida: tratar como velha, ou seja, pode-se procurar
  );
$$;

comment on function public.is_region_search_stale(uuid, integer) is
  'true se a região nunca foi pesquisada ou se a busca passou da validade.';
