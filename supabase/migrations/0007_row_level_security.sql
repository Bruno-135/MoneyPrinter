-- ============================================================================
-- 0007 — Row Level Security
--
-- Hoje só há um utilizador. A RLS entra na mesma, e desde a primeira migração,
-- porque é o que torna o salto para multiutilizador uma mudança de zero linhas
-- de código de aplicação: o isolamento por dono vive na base de dados, não nas
-- queries.
--
-- Regra geral: cada dono vê e mexe apenas nas suas linhas.
-- Exceção: uma landing page publicada e dentro da validade é legível por
--          qualquer pessoa (é para isso que serve).
-- ============================================================================

alter table public.searched_regions   enable row level security;
alter table public.region_searches    enable row level security;
alter table public.businesses         enable row level security;
alter table public.generated_sites    enable row level security;
alter table public.menu_items         enable row level security;
alter table public.deals              enable row level security;
alter table public.deal_stage_events  enable row level security;
alter table public.site_visits        enable row level security;
alter table public.site_clicks        enable row level security;

-- ----------------------------------------------------------------------------
-- searched_regions
-- ----------------------------------------------------------------------------
create policy "regions: owner reads"   on public.searched_regions
  for select to authenticated using (owner_id = (select public.current_owner_id()));
create policy "regions: owner inserts" on public.searched_regions
  for insert to authenticated with check (owner_id = (select public.current_owner_id()));
create policy "regions: owner updates" on public.searched_regions
  for update to authenticated
  using (owner_id = (select public.current_owner_id()))
  with check (owner_id = (select public.current_owner_id()));
create policy "regions: owner deletes" on public.searched_regions
  for delete to authenticated using (owner_id = (select public.current_owner_id()));

-- ----------------------------------------------------------------------------
-- region_searches — registo histórico das chamadas à API: sem update
-- ----------------------------------------------------------------------------
create policy "region searches: owner reads"   on public.region_searches
  for select to authenticated using (owner_id = (select public.current_owner_id()));
create policy "region searches: owner inserts" on public.region_searches
  for insert to authenticated with check (owner_id = (select public.current_owner_id()));
create policy "region searches: owner deletes" on public.region_searches
  for delete to authenticated using (owner_id = (select public.current_owner_id()));

-- ----------------------------------------------------------------------------
-- businesses
-- ----------------------------------------------------------------------------
create policy "businesses: owner reads"   on public.businesses
  for select to authenticated using (owner_id = (select public.current_owner_id()));
create policy "businesses: owner inserts" on public.businesses
  for insert to authenticated with check (owner_id = (select public.current_owner_id()));
create policy "businesses: owner updates" on public.businesses
  for update to authenticated
  using (owner_id = (select public.current_owner_id()))
  with check (owner_id = (select public.current_owner_id()));
create policy "businesses: owner deletes" on public.businesses
  for delete to authenticated using (owner_id = (select public.current_owner_id()));

-- ----------------------------------------------------------------------------
-- generated_sites
-- ----------------------------------------------------------------------------
create policy "sites: owner reads"   on public.generated_sites
  for select to authenticated using (owner_id = (select public.current_owner_id()));
create policy "sites: owner inserts" on public.generated_sites
  for insert to authenticated with check (owner_id = (select public.current_owner_id()));
create policy "sites: owner updates" on public.generated_sites
  for update to authenticated
  using (owner_id = (select public.current_owner_id()))
  with check (owner_id = (select public.current_owner_id()));
create policy "sites: owner deletes" on public.generated_sites
  for delete to authenticated using (owner_id = (select public.current_owner_id()));

-- Leitura pública da landing page: só publicada e dentro da validade.
-- Passada a data de expiração, o link deixa de devolver seja o que for.
create policy "sites: public reads live pages" on public.generated_sites
  for select to anon, authenticated
  using (status = 'published' and expires_at > now());

-- ----------------------------------------------------------------------------
-- menu_items
-- ----------------------------------------------------------------------------
create policy "menu: owner reads"   on public.menu_items
  for select to authenticated using (owner_id = (select public.current_owner_id()));
create policy "menu: owner inserts" on public.menu_items
  for insert to authenticated with check (owner_id = (select public.current_owner_id()));
create policy "menu: owner updates" on public.menu_items
  for update to authenticated
  using (owner_id = (select public.current_owner_id()))
  with check (owner_id = (select public.current_owner_id()));
create policy "menu: owner deletes" on public.menu_items
  for delete to authenticated using (owner_id = (select public.current_owner_id()));

-- O cardápio segue a visibilidade da página a que pertence.
create policy "menu: public reads live pages" on public.menu_items
  for select to anon, authenticated
  using (
    exists (
      select 1
      from public.generated_sites s
      where s.id = menu_items.site_id
        and s.status = 'published'
        and s.expires_at > now()
    )
  );

-- ----------------------------------------------------------------------------
-- deals
-- ----------------------------------------------------------------------------
create policy "deals: owner reads"   on public.deals
  for select to authenticated using (owner_id = (select public.current_owner_id()));
create policy "deals: owner inserts" on public.deals
  for insert to authenticated with check (owner_id = (select public.current_owner_id()));
create policy "deals: owner updates" on public.deals
  for update to authenticated
  using (owner_id = (select public.current_owner_id()))
  with check (owner_id = (select public.current_owner_id()));
create policy "deals: owner deletes" on public.deals
  for delete to authenticated using (owner_id = (select public.current_owner_id()));

-- ----------------------------------------------------------------------------
-- deal_stage_events — só leitura
--
-- Nem INSERT, nem UPDATE, nem DELETE para ninguém. O histórico é escrito pelo
-- trigger `log_deal_stage_change` (SECURITY DEFINER) e mais ninguém lhe toca:
-- um histórico que se pode editar não é um histórico.
-- ----------------------------------------------------------------------------
create policy "deal history: owner reads" on public.deal_stage_events
  for select to authenticated using (owner_id = (select public.current_owner_id()));

-- ----------------------------------------------------------------------------
-- site_visits / site_clicks — só leitura para o dono
--
-- A escrita vem das páginas públicas, por visitantes anónimos, e passa pelas
-- funções SECURITY DEFINER da migração 0008. Assim um visitante não consegue
-- inserir eventos falsos noutro site nem escrever colunas que não deve.
-- ----------------------------------------------------------------------------
create policy "visits: owner reads" on public.site_visits
  for select to authenticated using (owner_id = (select public.current_owner_id()));
create policy "visits: owner deletes" on public.site_visits
  for delete to authenticated using (owner_id = (select public.current_owner_id()));

create policy "clicks: owner reads" on public.site_clicks
  for select to authenticated using (owner_id = (select public.current_owner_id()));
create policy "clicks: owner deletes" on public.site_clicks
  for delete to authenticated using (owner_id = (select public.current_owner_id()));
