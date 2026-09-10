-- ============================================================================
-- 0019 — fotografias do próprio comércio, vindas do Google
--
-- Até aqui as páginas usavam imagens desenhadas ou fotografias de banco. As
-- duas resolvem o buraco, nenhuma resolve o argumento: uma foto da LOJA do
-- comerciante vale mais do que qualquer fotografia bonita de outra loja
-- qualquer.
--
-- Duas coisas separadas, e a distinção é o que faz isto não custar uma fortuna:
--
--   `businesses.google_photos`  — a LISTA de fotos de um comércio (nomes e
--       atribuições, não imagens). Pede-se uma vez por comércio, e só para os
--       comércios a que se vai mesmo fazer site. Não caduca: a lista muda
--       devagar e uma foto a menos não parte nada.
--
--   `google_photo_uris`         — o endereço temporário de UMA foto. A Google
--       só o dá a pedido e ele expira, por isso guarda-se com validade. Sem
--       este cache, cada visita à página de um comerciante era uma chamada
--       paga; com ele, é uma por dia por foto.
--
-- As atribuições viajam sempre com a foto. Publicar uma foto do Google sem
-- dizer quem a tirou não é permitido, e deitar fora esse campo aqui tornaria
-- impossível cumprir a regra lá à frente.
-- ============================================================================

alter table public.businesses
  add column if not exists google_photos jsonb not null default '[]'::jsonb,
  add column if not exists photos_fetched_at timestamptz;

comment on column public.businesses.google_photos is
  'Fotos do comércio no Google: nome e atribuições, nunca a imagem.';
comment on column public.businesses.photos_fetched_at is
  'Quando a lista foi pedida. Nulo = nunca se pagou por ela.';

create table public.google_photo_uris (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid()
    references auth.users (id) on delete cascade,

  -- `places/XXX/photos/YYY`, tal como a Google o dá.
  photo_name text not null check (btrim(photo_name) <> ''),
  max_width_px integer not null check (max_width_px between 100 and 4800),

  photo_uri text not null,
  fetched_at timestamptz not null default now(),
  created_at timestamptz not null default now(),

  constraint google_photo_uris_unique unique (owner_id, photo_name, max_width_px)
);

comment on table public.google_photo_uris is
  'Cache dos endereços temporários das fotos do Google. Consultar antes de pagar outra vez.';

create index google_photo_uris_fresco_idx
  on public.google_photo_uris (photo_name, fetched_at desc);

alter table public.google_photo_uris enable row level security;

create policy "fotos google: owner reads"   on public.google_photo_uris
  for select to authenticated using (owner_id = (select public.current_owner_id()));
create policy "fotos google: owner inserts" on public.google_photo_uris
  for insert to authenticated with check (owner_id = (select public.current_owner_id()));
create policy "fotos google: owner updates" on public.google_photo_uris
  for update to authenticated
  using (owner_id = (select public.current_owner_id()))
  with check (owner_id = (select public.current_owner_id()));
create policy "fotos google: owner deletes" on public.google_photo_uris
  for delete to authenticated using (owner_id = (select public.current_owner_id()));
