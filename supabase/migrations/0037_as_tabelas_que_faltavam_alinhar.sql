-- As tabelas que ainda perguntavam "quem está a ver?" em vez de "de quem é?".
--
-- A 0036 abriu o painel a mais do que uma pessoa mudando `current_owner_id()`.
-- Só que sete tabelas nunca chegaram a usar essa função: foram escritas com
-- `auth.uid()` à letra. Sem esta migração, um convidado entrava, via a lista
-- de leads do dono — e depois abria os e-mails recebidos e encontrava-os
-- vazios, sem erro nenhum e sem perceber porquê. Meio painel a funcionar é
-- pior do que nenhum, porque ninguém desconfia.
--
-- Nada aqui muda QUEM pode ver o quê para quem já usava o painel sozinho:
-- para quem não é membro de ninguém, `current_owner_id()` devolve `auth.uid()`
-- e as políticas ficam exactamente como estavam.

-- ---------- pedidos ----------
drop policy if exists "pedidos_owner_all" on public.pedidos;
create policy "pedidos_owner_all" on public.pedidos for all to authenticated
  using (owner_id = (select public.current_owner_id()))
  with check (owner_id = (select public.current_owner_id()));

-- ---------- site_pages ----------
drop policy if exists "site_pages_owner_all" on public.site_pages;
create policy "site_pages_owner_all" on public.site_pages for all to authenticated
  using (owner_id = (select public.current_owner_id()))
  with check (owner_id = (select public.current_owner_id()));

-- ---------- site_products ----------
drop policy if exists "site_products_owner_all" on public.site_products;
create policy "site_products_owner_all" on public.site_products for all to authenticated
  using (owner_id = (select public.current_owner_id()))
  with check (owner_id = (select public.current_owner_id()));

-- ---------- client_payments ----------
drop policy if exists "client_payments_select_own" on public.client_payments;
create policy "client_payments_select_own" on public.client_payments for select to authenticated
  using (owner_id = (select public.current_owner_id()));

drop policy if exists "client_payments_insert_own" on public.client_payments;
create policy "client_payments_insert_own" on public.client_payments for insert to authenticated
  with check (owner_id = (select public.current_owner_id()));

drop policy if exists "client_payments_update_own" on public.client_payments;
create policy "client_payments_update_own" on public.client_payments for update to authenticated
  using (owner_id = (select public.current_owner_id()))
  with check (owner_id = (select public.current_owner_id()));

drop policy if exists "client_payments_delete_own" on public.client_payments;
create policy "client_payments_delete_own" on public.client_payments for delete to authenticated
  using (owner_id = (select public.current_owner_id()));

-- ---------- client_code_counters ----------
drop policy if exists "client_code_counters_select_own" on public.client_code_counters;
create policy "client_code_counters_select_own" on public.client_code_counters for select to authenticated
  using (owner_id = (select public.current_owner_id()));

-- ---------- contact_events ----------
drop policy if exists "contact_events_select_own" on public.contact_events;
create policy "contact_events_select_own" on public.contact_events for select to authenticated
  using (owner_id = (select public.current_owner_id()));

drop policy if exists "contact_events_insert_own" on public.contact_events;
create policy "contact_events_insert_own" on public.contact_events for insert to authenticated
  with check (owner_id = (select public.current_owner_id()));

-- ---------- support_requests ----------
drop policy if exists "support_requests_select_own" on public.support_requests;
create policy "support_requests_select_own" on public.support_requests for select to authenticated
  using (owner_id = (select public.current_owner_id()));

drop policy if exists "support_requests_insert_own" on public.support_requests;
create policy "support_requests_insert_own" on public.support_requests for insert to authenticated
  with check (owner_id = (select public.current_owner_id()));

drop policy if exists "support_requests_update_own" on public.support_requests;
create policy "support_requests_update_own" on public.support_requests for update to authenticated
  using (owner_id = (select public.current_owner_id()))
  with check (owner_id = (select public.current_owner_id()));

drop policy if exists "support_requests_delete_own" on public.support_requests;
create policy "support_requests_delete_own" on public.support_requests for delete to authenticated
  using (owner_id = (select public.current_owner_id()));

-- ---------- as fotografias ----------
--
-- A pasta de cada ficheiro é o id do DONO e não o de quem carrega. Uma
-- fotografia é do site, o site é do dono, e uma fotografia posta por um
-- convidado tem de continuar lá — e continuar a poder ser apagada pelo dono —
-- no dia em que esse convidado sair da equipa.
drop policy if exists "fotos: dono escreve" on storage.objects;
create policy "fotos: dono escreve" on storage.objects for insert to authenticated
  with check (
    bucket_id = 'fotos-sites'
    and (storage.foldername(name))[1] = (select public.current_owner_id())::text
  );

drop policy if exists "fotos: dono atualiza" on storage.objects;
create policy "fotos: dono atualiza" on storage.objects for update to authenticated
  using (
    bucket_id = 'fotos-sites'
    and (storage.foldername(name))[1] = (select public.current_owner_id())::text
  )
  with check (
    bucket_id = 'fotos-sites'
    and (storage.foldername(name))[1] = (select public.current_owner_id())::text
  );

drop policy if exists "fotos: dono apaga" on storage.objects;
create policy "fotos: dono apaga" on storage.objects for delete to authenticated
  using (
    bucket_id = 'fotos-sites'
    and (storage.foldername(name))[1] = (select public.current_owner_id())::text
  );
