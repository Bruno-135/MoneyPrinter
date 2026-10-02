-- Saber com quem já se falou, e por onde.
--
-- A base sabia que um contacto aconteceu (`contact_events`) mas a lista não
-- deixava filtrar por isso. Com 5038 leads, "quem é que ainda não contactei?"
-- era uma pergunta sem resposta — e sem resposta a essa pergunta, mandar
-- emails é mandar às cegas, e a mesma pessoa leva três vezes a mesma coisa.
--
-- O estado é UM valor por lead, calculado e não guardado. Guardado, ficava
-- velho na primeira vez que alguém esquecesse de o actualizar; calculado,
-- nunca pode discordar dos factos que estão nas outras tabelas.

-- ---------- o email de cada negócio ----------
alter table public.businesses add column if not exists email text;
alter table public.businesses add column if not exists email_origem text;
alter table public.businesses add column if not exists email_visto_em timestamptz;

comment on column public.businesses.email is 'Email de contacto público do negócio.';
comment on column public.businesses.email_origem is 'De onde veio: site, google, mao.';

-- ---------- quem pediu para não ser contactado ----------
--
-- Vale para SEMPRE e para TODOS os canais. Guarda o email e o negócio em
-- separado de propósito: quem pede para sair pelo link do email pode não estar
-- ligado a nenhum negócio da base, e tem de ficar fora na mesma.
create table if not exists public.nao_contactar (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid(),
  business_id uuid references public.businesses (id) on delete set null,
  email text,
  motivo text,
  created_at timestamptz not null default now(),
  constraint tem_email_ou_negocio check (email is not null or business_id is not null)
);

create unique index if not exists nao_contactar_email_idx
  on public.nao_contactar (owner_id, lower(email)) where email is not null;
create index if not exists nao_contactar_negocio_idx on public.nao_contactar (business_id);

alter table public.nao_contactar enable row level security;

drop policy if exists "nao_contactar: o dono manda" on public.nao_contactar;
create policy "nao_contactar: o dono manda" on public.nao_contactar for all to authenticated
  using (owner_id = (select public.current_owner_id()))
  with check (owner_id = (select public.current_owner_id()));

-- ---------- cada email que sai ----------
create table if not exists public.emails_enviados (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid(),
  business_id uuid references public.businesses (id) on delete cascade,

  para text not null,
  assunto text not null,
  corpo text not null,
  campanha text,

  -- enviado → entregue → aberto → respondeu, ou devolvido/queixa pelo caminho.
  estado text not null default 'enviado',
  resend_id text,

  enviado_em timestamptz not null default now(),
  entregue_em timestamptz,
  aberto_em timestamptz,
  respondeu_em timestamptz,
  erro text
);

create index if not exists emails_enviados_negocio_idx on public.emails_enviados (business_id);
create index if not exists emails_enviados_campanha_idx on public.emails_enviados (owner_id, campanha);
create index if not exists emails_enviados_quando_idx on public.emails_enviados (owner_id, enviado_em desc);

alter table public.emails_enviados enable row level security;

drop policy if exists "emails_enviados: o dono manda" on public.emails_enviados;
create policy "emails_enviados: o dono manda" on public.emails_enviados for all to authenticated
  using (owner_id = (select public.current_owner_id()))
  with check (owner_id = (select public.current_owner_id()));

-- ---------- o estado, na vista que a lista já usa ----------
--
-- Acrescenta-se à vista que existe em vez de uma vista nova: a lista, as
-- caixas de filtro e a fila leem todas desta, e duas vistas acabavam a
-- discordar uma da outra.
-- As colunas vao uma a uma, e as novas vao no FIM. Com `b.*` isto rebenta:
-- `create or replace view` so deixa ACRESCENTAR colunas, e o `*` passou a
-- trazer as tres colunas de email no meio, a empurrar todas as outras. O erro
-- que da — «cannot change name of view column "stage" to "client_code"» — nao
-- diz isso em lado nenhum.
create or replace view public.businesses_with_stage as
select
  b.id, b.owner_id, b.region_id, b.google_place_id, b.name, b.business_category,
  b.google_types, b.is_food_service, b.formatted_address, b.street, b.street_number,
  b.postal_code, b.locality, b.admin_area, b.country_code, b.latitude, b.longitude,
  b.phone_raw, b.phone_e164, b.phone_country_code, b.phone_country, b.website_url,
  b.has_website, b.social_links, b.has_social, b.rating, b.reviews_count, b.price_level,
  b.business_status, b.opening_hours, b.score, b.score_breakdown, b.score_version,
  b.score_calculated_at, b.google_raw, b.google_fetched_at, b.details_fetched_at,
  b.is_archived, b.internal_notes, b.first_seen_at, b.last_synced_at, b.created_at,
  b.updated_at, b.website_host, b.website_kind, b.google_photos, b.photos_fetched_at,
  b.google_reviews, b.reviews_fetched_at,
  coalesce(d.stage, 'new'::deal_stage) as stage,
  d.next_action_at,
  d.notes as deal_notes,
  (exists (select 1 from public.generated_sites g where g.business_id = b.id)) as has_site,
  (exists (
    select 1 from public.generated_sites g
     where g.business_id = b.id and g.status = 'published'::site_status and g.expires_at > now()
  )) as has_live_site,
  b.email,
  b.email_origem,
  b.email_visto_em,

  -- Um valor só, e os cinco são exclusivos entre si. A lista de não contactar
  -- ganha sempre a tudo o resto: se a pessoa pediu para sair, não interessa
  -- por onde se lhe falou antes.
  case
    when exists (
      select 1 from public.nao_contactar n
       where n.business_id = b.id
          or (n.email is not null and b.email is not null and lower(n.email) = lower(b.email))
    ) then 'nao_contactar'
    when exists (select 1 from public.emails_enviados e where e.business_id = b.id)
     and exists (select 1 from public.contact_events c where c.business_id = b.id and c.channel <> 'email')
      then 'email_e_whatsapp'
    when exists (select 1 from public.emails_enviados e where e.business_id = b.id)
      then 'email_enviado'
    when exists (select 1 from public.contact_events c where c.business_id = b.id)
      then 'whatsapp_enviado'
    else 'por_contactar'
  end as estado_do_contacto,

  (select max(c.created_at) from public.contact_events c where c.business_id = b.id) as falado_em,
  (select max(e.enviado_em) from public.emails_enviados e where e.business_id = b.id) as emailado_em

from public.businesses b
left join public.deals d on d.business_id = b.id;

-- ---------- a caixa de filtro ----------
create or replace function public.facet_counts(
  p_field text,
  p_kinds text[] default null,
  p_stages text[] default null,
  p_categories text[] default null,
  p_countries text[] default null,
  p_has_site boolean default null,
  p_region_id uuid default null,
  p_contactos text[] default null
)
returns table(value text, count bigint)
language sql
stable
as $$
  select
    case p_field
      when 'website_kind'       then b.website_kind::text
      when 'stage'              then b.stage::text
      when 'business_category'  then b.business_category
      when 'country_code'       then b.country_code
      when 'has_site'           then b.has_site::text
      when 'estado_do_contacto' then b.estado_do_contacto
    end as value,
    count(*) as count
  from public.businesses_with_stage b
  where b.is_archived = false
    and (p_kinds      is null or cardinality(p_kinds)      = 0 or b.website_kind::text = any (p_kinds))
    and (p_stages     is null or cardinality(p_stages)     = 0 or b.stage::text        = any (p_stages))
    and (p_categories is null or cardinality(p_categories) = 0 or b.business_category  = any (p_categories))
    and (p_countries  is null or cardinality(p_countries)  = 0 or b.country_code       = any (p_countries))
    and (p_contactos  is null or cardinality(p_contactos)  = 0 or b.estado_do_contacto = any (p_contactos))
    and (p_has_site   is null or b.has_site = p_has_site)
    and (p_region_id  is null or b.region_id = p_region_id)
  group by 1
  having case p_field
           when 'website_kind'       then b.website_kind::text
           when 'stage'              then b.stage::text
           when 'business_category'  then b.business_category
           when 'country_code'       then b.country_code
           when 'has_site'           then b.has_site::text
           when 'estado_do_contacto' then b.estado_do_contacto
         end is not null
  order by 1;
$$;

drop function if exists public.facet_counts(text, text[], text[], text[], text[], boolean, uuid);
