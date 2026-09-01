-- ============================================================================
-- 0003 — Comércios
--
-- Uma linha por estabelecimento devolvido pelo Google Places, com tudo o que a
-- API deu (incluindo o JSON inteiro em `google_raw`) mais o score calculado.
-- ============================================================================

create table public.businesses (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid()
    references auth.users (id) on delete cascade,

  -- Região que o encontrou. `set null` porque apagar uma pesquisa não deve
  -- apagar comércios já trabalhados.
  region_id uuid references public.searched_regions (id) on delete set null,

  -- ---------------------------------------------------------------------
  -- Identidade
  -- ---------------------------------------------------------------------
  google_place_id text not null check (btrim(google_place_id) <> ''),
  name text not null check (btrim(name) <> ''),

  -- Ramo: o rótulo que se usa na interface.
  business_category text not null check (btrim(business_category) <> ''),
  -- Tipos crus do Places ('bakery', 'restaurant', ...). Base do modelo especial.
  google_types text[] not null default '{}'::text[],

  -- Restaurantes e padarias levam a landing page com cardápio + WhatsApp.
  -- Calculado pela BD para que a regra não se espalhe pelo código.
  is_food_service boolean generated always as (
    google_types && array[
      'restaurant', 'bakery', 'cafe', 'coffee_shop', 'bar',
      'meal_takeaway', 'meal_delivery', 'food', 'pizza_restaurant',
      'sandwich_shop', 'ice_cream_shop', 'brunch_restaurant', 'breakfast_restaurant'
    ]::text[]
  ) stored,

  -- ---------------------------------------------------------------------
  -- Morada, em campos separados (PT e BR não seguem o mesmo formato)
  -- ---------------------------------------------------------------------
  formatted_address text,
  street text,
  street_number text,
  postal_code text,
  locality text,        -- concelho / cidade / município
  admin_area text,      -- distrito (PT) / estado (BR)
  country_code text not null check (country_code ~ '^[A-Z]{2}$'),

  latitude numeric(9, 6) check (latitude between -90 and 90),
  longitude numeric(9, 6) check (longitude between -180 and 180),

  -- ---------------------------------------------------------------------
  -- Telefone — separado do país de propósito
  --
  -- PT: 912 345 678 / +351 912 345 678
  -- BR: (11) 91234-5678 / +55 11 91234-5678
  -- Guardam-se as três peças em vez de tentar adivinhar o país pelo formato:
  -- o formato nacional é ambíguo e o indicativo não se infere do número.
  -- ---------------------------------------------------------------------
  phone_raw text,                 -- exatamente como veio do Google
  phone_e164 text                 -- normalizado, ex.: '+351912345678'
    check (phone_e164 is null or phone_e164 ~ '^\+[1-9][0-9]{6,14}$'),
  phone_country_code text         -- indicativo, ex.: '+351', '+55'
    check (phone_country_code is null or phone_country_code ~ '^\+[1-9][0-9]{0,3}$'),
  phone_country text              -- país do NÚMERO, que pode não ser o da morada
    check (phone_country is null or phone_country ~ '^[A-Z]{2}$'),

  -- ---------------------------------------------------------------------
  -- Presença digital — o critério central da prospeção
  -- ---------------------------------------------------------------------
  website_url text,
  has_website boolean generated always as (
    website_url is not null and btrim(website_url) <> ''
  ) stored,

  -- {"facebook": "...", "instagram": "...", "tiktok": "..."}
  social_links jsonb not null default '{}'::jsonb,
  has_social boolean generated always as (
    social_links <> '{}'::jsonb
  ) stored,

  -- ---------------------------------------------------------------------
  -- Reputação
  -- ---------------------------------------------------------------------
  rating numeric(2, 1) check (rating between 0 and 5),
  reviews_count integer check (reviews_count >= 0),
  price_level smallint check (price_level between 0 and 4),
  business_status text,     -- OPERATIONAL, CLOSED_TEMPORARILY, ...
  opening_hours jsonb,

  -- ---------------------------------------------------------------------
  -- Score de 0 a 100: probabilidade de fechar a venda
  -- ---------------------------------------------------------------------
  score smallint not null default 0 check (score between 0 and 100),
  -- Peso a peso, para se poder explicar a nota ao utilizador e depurar a
  -- fórmula sem recalcular tudo.
  score_breakdown jsonb not null default '{}'::jsonb,
  score_version integer not null default 1,
  score_calculated_at timestamptz,

  -- ---------------------------------------------------------------------
  -- Bruto do Google — guardar tudo, para nunca repetir a consulta
  -- ---------------------------------------------------------------------
  google_raw jsonb not null default '{}'::jsonb,
  google_fetched_at timestamptz not null default now(),
  details_fetched_at timestamptz,   -- null = só veio da busca, sem Place Details

  -- ---------------------------------------------------------------------
  -- Gestão
  -- ---------------------------------------------------------------------
  is_archived boolean not null default false,
  internal_notes text,
  first_seen_at timestamptz not null default now(),
  last_synced_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- Mesmo place_id nunca entra duas vezes para o mesmo dono.
  constraint businesses_owner_place_unique unique (owner_id, google_place_id)
);

comment on table public.businesses is
  'Comércios vindos do Google Places, com presença digital e score de venda.';
comment on column public.businesses.google_raw is
  'Resposta completa do Places para este local. Reprocessar daqui em vez de rechamar a API.';
comment on column public.businesses.score is
  'Probabilidade de fechar a venda, 0-100. Ver score_breakdown para os pesos.';
comment on column public.businesses.is_food_service is
  'true para restaurantes e padarias: usam a landing page com cardápio e WhatsApp.';
comment on column public.businesses.phone_country is
  'País do número de telefone. Separado de country_code porque nem sempre coincidem.';

-- Índice principal da lista: comércios do dono, do melhor score para o pior.
create index businesses_owner_score_idx
  on public.businesses (owner_id, score desc, reviews_count desc nulls last)
  where is_archived = false;

-- A consulta que interessa: quem não tem site.
create index businesses_owner_no_website_idx
  on public.businesses (owner_id, score desc)
  where has_website = false and is_archived = false;

create index businesses_owner_region_idx on public.businesses (owner_id, region_id);
create index businesses_owner_category_idx on public.businesses (owner_id, business_category);
create index businesses_food_service_idx
  on public.businesses (owner_id, score desc) where is_food_service = true;
create index businesses_country_locality_idx
  on public.businesses (country_code, locality);
create index businesses_google_types_idx on public.businesses using gin (google_types);
create index businesses_google_raw_idx on public.businesses using gin (google_raw jsonb_path_ops);

create trigger businesses_set_updated_at
  before update on public.businesses
  for each row execute function public.set_updated_at();
