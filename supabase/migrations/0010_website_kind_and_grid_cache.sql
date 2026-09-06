-- ============================================================================
-- 0010 — Classificação do site e cache ao nível da célula da grelha
--
-- Duas coisas que a etapa 2 precisa:
--   1. distinguir os TRÊS casos de presença digital, não dois;
--   2. impossibilitar, pelo schema, repetir uma chamada paga já feita.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Os três casos de site
--
--   none         -> não tem nada no campo do site
--   social_only  -> pôs lá a página de Facebook/Instagram, ou um site-montra
--                   gratuito (business.site da própria Google)
--   real         -> tem mesmo um site
--
-- Os dois primeiros são prospetos. O terceiro não é.
-- ----------------------------------------------------------------------------
create type public.website_kind as enum ('none', 'social_only', 'real');

-- Domínio do site, extraído do URL. Serve para ver e depurar a classificação
-- sem ter de reprocessar nada.
alter table public.businesses
  add column website_host text generated always as (
    nullif(
      lower(regexp_replace(coalesce(website_url, ''), '^(?:https?://)?(?:www\.)?([^/?#]+).*$', '\1')),
      ''
    )
  ) stored;

-- A classificação em si.
--
-- O Postgres não deixa uma coluna gerada referir outra coluna gerada, por isso
-- a extração do domínio aparece repetida aqui em vez de reaproveitar
-- `website_host`. É feio, mas mantém a regra inteira dentro da base de dados.
alter table public.businesses
  add column website_kind public.website_kind generated always as (
    case
      when website_url is null or btrim(website_url) = ''
        then 'none'::public.website_kind
      when lower(regexp_replace(website_url, '^(?:https?://)?(?:www\.)?([^/?#]+).*$', '\1')) in (
             'facebook.com', 'm.facebook.com', 'fb.com', 'fb.me',
             'instagram.com', 'tiktok.com',
             'linktr.ee', 'linktree.com', 'beacons.ai', 'bio.link',
             'wa.me', 'api.whatsapp.com', 'chat.whatsapp.com',
             'twitter.com', 'x.com', 'youtube.com', 'youtu.be',
             'linkedin.com', 'pinterest.com', 'pinterest.pt', 'pinterest.com.br',
             'bit.ly', 'business.site', 'negocio.site',
             'sites.google.com', 'wixsite.com', 'blogspot.com', 'blogspot.pt', 'blogspot.com.br'
           )
        then 'social_only'::public.website_kind
      -- Sites-montra gratuitos da Google: <nome>.business.site / .negocio.site
      when lower(regexp_replace(website_url, '^(?:https?://)?(?:www\.)?([^/?#]+).*$', '\1'))
             like any (array['%.business.site', '%.negocio.site', '%.wixsite.com', '%.blogspot.com'])
        then 'social_only'::public.website_kind
      else 'real'::public.website_kind
    end
  ) stored;

comment on column public.businesses.website_kind is
  'Três casos: none (sem nada), social_only (rede social ou site-montra grátis), real. Os dois primeiros são prospetos.';
comment on column public.businesses.website_host is
  'Domínio extraído de website_url. Existe para poder auditar a classificação.';

-- `has_website` mantém o significado que sempre teve ("o campo vem preenchido")
-- e não é redefinida: mudar em silêncio o que uma coluna quer dizer é como se
-- fabricam bugs. A consulta que interessa à prospeção usa website_kind.
create index businesses_owner_prospects_idx
  on public.businesses (owner_id, score desc, reviews_count desc nulls last)
  where website_kind <> 'real' and is_archived = false;

-- ----------------------------------------------------------------------------
-- 2. Cache ao nível da célula da grelha
--
-- Um varrimento de uma região é feito de N pesquisas por raio, uma por ponto de
-- uma grelha. Sem isto, um varrimento interrompido a meio recomeçaria do zero e
-- pagaria outra vez as células já feitas.
--
-- O índice único aplica-se só às chamadas bem sucedidas: uma célula que falhou
-- tem de poder ser repetida.
-- ----------------------------------------------------------------------------
alter table public.region_searches
  add column grid_cell_key text;

comment on column public.region_searches.grid_cell_key is
  'Identifica a célula da grelha desta chamada (lat|lng|raio arredondados). Único por região.';

create unique index region_searches_region_cell_unique
  on public.region_searches (region_id, grid_cell_key)
  where grid_cell_key is not null and error_message is null;

-- ----------------------------------------------------------------------------
-- 3. Parâmetros do varrimento na região
-- ----------------------------------------------------------------------------
alter table public.searched_regions
  add column grid_radius_meters integer
    check (grid_radius_meters is null or grid_radius_meters between 200 and 5000);

alter table public.searched_regions
  add column grid_cells_total integer not null default 0 check (grid_cells_total >= 0);

-- Células que devolveram o máximo de resultados: havia mais e o Google cortou.
-- Sem este registo, "cobri a região toda" seria uma suposição.
alter table public.searched_regions
  add column saturated_cells integer not null default 0 check (saturated_cells >= 0);

comment on column public.searched_regions.grid_radius_meters is
  'Raio de cada célula da grelha, em metros. Diferente de radius_meters, que é o raio da região.';
comment on column public.searched_regions.saturated_cells is
  'Células que atingiram o limite de 20 resultados do Places: pode faltar cobertura nessa zona.';
