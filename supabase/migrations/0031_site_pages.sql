-- ---------------------------------------------------------------------------
-- 0031 — um site com várias páginas, e não uma página só
--
-- Até aqui um site era UMA página: uma linha em `generated_sites`, uma coluna
-- `custom_html`, uma rota `/s/<code>`. Tudo o que se gerava saía uma landing
-- page — e não por causa do desenho, mas porque não havia onde pôr a segunda
-- página.
--
-- Uma loja precisa de menu, de uma página por secção, de ficha de peça e de
-- uma página de contacto. Um restaurante precisa da ementa à parte. Um
-- advogado precisa de uma página por área.
--
-- A página inicial FICA onde está, em `generated_sites`. Não se mexe: a
-- pré-visualização, o PDF, a exportação, o registo de visitas e a publicação
-- foram todos escritos à volta dela, e movê-la agora era arriscar o que já
-- funciona para arrumar uma coluna. As páginas novas vivem aqui e penduram-se
-- na mesma linha.
--
-- O endereço passa a ser `/s/<code>` para a inicial e `/s/<code>/<slug>` para
-- as outras. O sanitizador já deixa passar `href` que comece por `/`, portanto
-- os menus entre páginas funcionam sem lhe tocar.
-- ---------------------------------------------------------------------------

create table public.site_pages (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  site_id uuid not null references public.generated_sites (id) on delete cascade,

  -- O que vai no endereço. Sem acentos, sem barras, sem maiúsculas: é o que
  -- uma pessoa escreve ao telefone e o que aparece no WhatsApp.
  slug text not null check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and length(slug) between 2 and 40),

  -- O que aparece no menu. Este leva acentos e maiúsculas à vontade.
  title text not null check (length(trim(title)) between 1 and 60),

  custom_html text,

  -- A ordem do menu. Smallint porque ninguém faz cinquenta páginas.
  ordem smallint not null default 0,

  ai_model text,
  ai_brief text,
  ai_generated_at timestamptz,
  ai_input_tokens integer,
  ai_output_tokens integer,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- Dois endereços iguais no mesmo site davam uma página inalcançável.
  unique (site_id, slug)
);

create index site_pages_site_ordem_idx on public.site_pages (site_id, ordem, created_at);

create trigger site_pages_set_updated_at
  before update on public.site_pages
  for each row execute function public.set_updated_at();

alter table public.site_pages enable row level security;

create policy "site_pages_owner_all"
  on public.site_pages for all
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

-- O visitante lê as páginas de um site que esteja no ar, e só. A regra é a
-- mesma da página inicial e vem da mesma função: se a inicial expirou, as
-- outras expiraram com ela — um site meio no ar não é um site.
create policy "site_pages_public_reads_live"
  on public.site_pages for select to anon, authenticated
  using (public.is_site_live(site_id));
