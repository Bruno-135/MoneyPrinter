-- ============================================================================
-- 0011 — Fotografias das landing pages
--
-- As fotos do Google Places não se podem usar (licença própria, condições de
-- atribuição, e estas páginas são vendidas a terceiros). As que aqui ficam são
-- as que o comerciante entrega — dele, e com autorização dele para as usar.
--
-- O balde é PÚBLICO na leitura, e isso é intencional: estas imagens aparecem
-- num site que qualquer pessoa pode abrir. Pô-las atrás de autenticação
-- obrigaria a assinar cada URL a cada visita, para proteger uma fotografia da
-- montra de uma loja. A escrita é que é fechada.
-- ============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'fotos-sites',
  'fotos-sites',
  true,
  -- 5 MB. Uma fotografia de telemóvel em bruto passa disto; o carregamento
  -- redimensiona antes de enviar. O limite existe para travar o engano de
  -- alguém tentar enviar um vídeo.
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
  set public             = excluded.public,
      file_size_limit    = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- ----------------------------------------------------------------------------
-- Políticas
--
-- Os ficheiros ficam em <owner_id>/<site_id>/<ficheiro>. A primeira pasta ser
-- o dono é o que permite escrever a regra de escrita sem consultar mais nada:
-- comparar o primeiro segmento do caminho com quem está autenticado.
-- ----------------------------------------------------------------------------

drop policy if exists "fotos: leitura pública"    on storage.objects;
drop policy if exists "fotos: dono escreve"       on storage.objects;
drop policy if exists "fotos: dono atualiza"      on storage.objects;
drop policy if exists "fotos: dono apaga"         on storage.objects;

create policy "fotos: leitura pública" on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'fotos-sites');

create policy "fotos: dono escreve" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'fotos-sites'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "fotos: dono atualiza" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'fotos-sites'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  )
  with check (
    bucket_id = 'fotos-sites'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "fotos: dono apaga" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'fotos-sites'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
