-- ============================================================================
-- 0018 — stock_photos: fotografias grátis, procuradas uma vez só
--
-- As páginas geradas passam a poder usar fotografias a sério de um banco de
-- imagens grátis, para o comerciante que ainda não deu fotos ver uma página
-- com pão verdadeiro em vez de um desenho.
--
-- O serviço é grátis mas tem limite de pedidos por hora, e por isso vale aqui
-- a mesma regra das consultas pagas: a resposta fica gravada e a mesma
-- pergunta nunca sai duas vezes para a rede. A chave é o texto NORMALIZADO
-- mais a orientação, porque as fotos deitadas e as em pé são conjuntos
-- diferentes.
--
-- Guardam-se sempre o nome do fotógrafo e o endereço da foto. A licença exige
-- o crédito; deitar fora esses campos aqui tornaria impossível cumpri-la na
-- página.
-- ============================================================================

create table public.stock_photos (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid()
    references auth.users (id) on delete cascade,

  -- De onde veio. Hoje só há um banco; a coluna existe para o dia em que
  -- houver outro e as duas caches não se confundirem.
  provider text not null default 'pexels' check (provider in ('pexels')),

  -- Pergunta normalizada mais orientação (ver lib/sites/imagens/stock.ts).
  query_key text not null check (btrim(query_key) <> ''),
  -- O que se perguntou de facto, para se perceber o histórico.
  query_text text not null,
  orientation text not null default 'landscape'
    check (orientation in ('landscape', 'portrait', 'square')),

  -- A lista de fotos já reduzida ao que as páginas usam: endereço, tamanho,
  -- descrição, autor, ligação de crédito e cor dominante.
  results jsonb not null default '[]'::jsonb,
  results_count integer not null default 0 check (results_count >= 0),

  fetched_at timestamptz not null default now(),
  created_at timestamptz not null default now(),

  -- A regra anti-desperdício, imposta pelo schema e não pelo código.
  constraint stock_photos_owner_query_unique unique (owner_id, provider, query_key)
);

comment on table public.stock_photos is
  'Cache das procuras em bancos de fotografia grátis. Consultar antes de chamar a API.';
comment on column public.stock_photos.query_key is
  'Pergunta normalizada + orientação. Calculada pela aplicação.';
comment on column public.stock_photos.results is
  'Fotos com autor e ligação de origem — o crédito exigido pela licença.';

alter table public.stock_photos enable row level security;

create policy "stock: owner reads"   on public.stock_photos
  for select to authenticated using (owner_id = (select public.current_owner_id()));
create policy "stock: owner inserts" on public.stock_photos
  for insert to authenticated with check (owner_id = (select public.current_owner_id()));
create policy "stock: owner updates" on public.stock_photos
  for update to authenticated
  using (owner_id = (select public.current_owner_id()))
  with check (owner_id = (select public.current_owner_id()));
create policy "stock: owner deletes" on public.stock_photos
  for delete to authenticated using (owner_id = (select public.current_owner_id()));
