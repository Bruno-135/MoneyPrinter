-- ============================================================================
-- 0004 — Landing pages geradas e itens de cardápio
-- ============================================================================

-- ----------------------------------------------------------------------------
-- generated_sites
--
-- O conteúdo fica em JSON e não em colunas: cada modelo tem secções diferentes
-- (o de restaurante tem cardápio e horários, o genérico tem serviços), e o
-- formato ainda vai mexer. Uma coluna por campo obrigaria a uma migração por
-- cada ajuste de layout.
-- ----------------------------------------------------------------------------
create table public.generated_sites (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid()
    references auth.users (id) on delete cascade,
  business_id uuid not null
    references public.businesses (id) on delete cascade,

  template public.site_template not null default 'standard',
  status public.site_status not null default 'draft',

  title text,
  -- {"hero": {...}, "about": {...}, "services": [...], "gallery": [...], "contact": {...}}
  content jsonb not null default '{}'::jsonb,
  -- cores, tipo de letra, logótipo
  theme jsonb not null default '{}'::jsonb,

  -- ---------------------------------------------------------------------
  -- Endereço público: /s/<public_code>
  -- Aleatório e não sequencial, e com validade.
  -- ---------------------------------------------------------------------
  public_code text not null default public.generate_public_code(10)
    check (public_code ~ '^[a-z2-9]{6,32}$'),
  published_at timestamptz,
  expires_at timestamptz not null default (now() + interval '30 days'),

  -- ---------------------------------------------------------------------
  -- Pedido por WhatsApp (modelo food_service). Número e país separados,
  -- pela mesma razão que em `businesses`.
  -- ---------------------------------------------------------------------
  whatsapp_number_e164 text
    check (whatsapp_number_e164 is null or whatsapp_number_e164 ~ '^\+[1-9][0-9]{6,14}$'),
  whatsapp_country text
    check (whatsapp_country is null or whatsapp_country ~ '^[A-Z]{2}$'),
  whatsapp_greeting text,   -- mensagem pré-preenchida do pedido

  -- ---------------------------------------------------------------------
  -- PDF de apresentação
  -- ---------------------------------------------------------------------
  pdf_storage_path text,
  pdf_generated_at timestamptz,

  version integer not null default 1 check (version >= 1),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- O código é público: tem de ser único em toda a tabela, não só por dono.
  constraint generated_sites_public_code_unique unique (public_code),
  constraint generated_sites_expires_after_creation check (expires_at > created_at),
  -- Publicado implica ter data de publicação.
  constraint generated_sites_published_has_date
    check (status <> 'published' or published_at is not null)
);

comment on table public.generated_sites is
  'Landing pages geradas a partir dos dados de um comércio.';
comment on column public.generated_sites.public_code is
  'Código aleatório do URL público. Único global, não sequencial.';
comment on column public.generated_sites.expires_at is
  'Fim da validade do link público. Passada esta data, a página deixa de abrir.';
comment on column public.generated_sites.content is
  'Conteúdo da página em JSON. Formato depende de `template`.';

create index generated_sites_owner_business_idx
  on public.generated_sites (owner_id, business_id);
create index generated_sites_owner_status_idx
  on public.generated_sites (owner_id, status, updated_at desc);
-- Suporta a leitura pública: código + ainda dentro da validade.
create index generated_sites_live_lookup_idx
  on public.generated_sites (public_code, expires_at)
  where status = 'published';
create index generated_sites_expires_idx on public.generated_sites (expires_at);

create trigger generated_sites_set_updated_at
  before update on public.generated_sites
  for each row execute function public.set_updated_at();

-- Uma página só abre se estiver publicada e dentro da validade.
create or replace function public.is_site_live(p_site_id uuid)
returns boolean
language sql
stable
set search_path = ''
as $$
  select coalesce(
    (
      select s.status = 'published' and s.expires_at > now()
      from public.generated_sites s
      where s.id = p_site_id
    ),
    false
  );
$$;

comment on function public.is_site_live(uuid) is
  'true se a landing page está publicada e ainda dentro da validade.';

-- ----------------------------------------------------------------------------
-- menu_items — cardápio das landing pages de restaurantes e padarias
--
-- Ligado ao SITE e não ao comércio: o cardápio é conteúdo da página, e gerar
-- uma nova versão do site não deve arrastar o cardápio de uma versão antiga.
-- ----------------------------------------------------------------------------
create table public.menu_items (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid()
    references auth.users (id) on delete cascade,
  site_id uuid not null
    references public.generated_sites (id) on delete cascade,

  section text not null default 'Geral' check (btrim(section) <> ''),
  name text not null check (btrim(name) <> ''),
  description text,

  -- Inteiro em cêntimos + moeda. Nunca vírgula flutuante para dinheiro, e a
  -- moeda é explícita porque PT usa EUR e BR usa BRL.
  price_cents integer check (price_cents >= 0),
  currency text not null default 'EUR' check (currency ~ '^[A-Z]{3}$'),

  image_url text,
  allergens text[] not null default '{}'::text[],

  position integer not null default 0,
  is_available boolean not null default true,
  is_highlight boolean not null default false,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.menu_items is
  'Itens de cardápio de uma landing page food_service.';
comment on column public.menu_items.price_cents is
  'Preço em cêntimos. Inteiro para não haver erro de arredondamento.';

create index menu_items_site_order_idx
  on public.menu_items (site_id, section, position, name);
create index menu_items_owner_idx on public.menu_items (owner_id);

create trigger menu_items_set_updated_at
  before update on public.menu_items
  for each row execute function public.set_updated_at();

-- Só um site com cardápio pode ter itens de cardápio.
create or replace function public.enforce_menu_item_template()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_template public.site_template;
begin
  select s.template into v_template
  from public.generated_sites s
  where s.id = new.site_id;

  if v_template is distinct from 'food_service' then
    raise exception
      'Itens de cardápio só são permitidos em sites com template food_service (site % tem template %)',
      new.site_id, coalesce(v_template::text, 'inexistente');
  end if;

  return new;
end;
$$;

create trigger menu_items_enforce_template
  before insert or update of site_id on public.menu_items
  for each row execute function public.enforce_menu_item_template();
