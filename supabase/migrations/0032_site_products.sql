-- ---------------------------------------------------------------------------
-- 0032 — as peças de uma loja
--
-- Uma página de loja gerada por IA é uma casca: o Google dá o nome, a morada,
-- o telefone e a avaliação de um comércio, e nunca um catálogo. Sem peças não
-- há preços, não há tamanhos, não há fotografias — e carregar numa peça não
-- leva a lado nenhum, porque não há peça nenhuma.
--
-- Daqui para a frente a página da loja deixa de ser escrita por um modelo e
-- passa a ser desenhada a partir DESTES dados. É o que faz a diferença entre
-- uma maqueta bonita e um site: a maqueta tem `{{ p.price }}`, isto tem 48 €.
--
-- Os tamanhos são uma lista de texto e não uma tabela à parte de propósito:
-- "M", "38", "T2" e "único" são todos tamanhos legítimos conforme a loja, e
-- uma tabela de tamanhos obrigava a inventar um vocabulário que não existe.
-- ---------------------------------------------------------------------------

create table public.site_products (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  site_id uuid not null references public.generated_sites (id) on delete cascade,

  -- A referência que vai na mensagem de WhatsApp e que a loja usa para saber
  -- de que peça se fala. Escrita por quem cadastra, não gerada: numa loja de
  -- segunda mão a etiqueta já existe e é essa que está pendurada na peça.
  ref text not null check (length(trim(ref)) between 1 and 24),

  name text not null check (length(trim(name)) between 1 and 120),
  description text,

  -- Em cêntimos, como todo o dinheiro deste sistema. `price_cents` é o que se
  -- paga; `old_price_cents` é o valor riscado ao lado, quando há.
  price_cents integer check (price_cents is null or price_cents >= 0),
  old_price_cents integer check (old_price_cents is null or old_price_cents >= 0),
  currency text not null default 'EUR' check (currency in ('EUR', 'BRL')),

  -- 'mulher', 'homem', 'crianca', 'casa'… Texto e não enum: cada loja divide
  -- a sua montra à maneira dela, e uma migração por secção nova era absurdo.
  familia text,
  tipo text,

  /** novo · seminovo · usado. O estado dito à frente é o que vende em cheio. */
  estado text not null default 'novo' check (estado in ('novo', 'seminovo', 'usado')),
  /** O defeito, por extenso, quando há. "Pequena marca na bainha, 1 cm." */
  nota_do_estado text,

  tamanhos text[] not null default '{}',
  cor text,

  -- Ficha técnica, livre: tecido, peito, cintura, comprimento, como lavar.
  ficha jsonb not null default '{}'::jsonb,

  -- Endereços das fotografias, por ordem. A primeira é a da grelha.
  fotos jsonb not null default '[]'::jsonb,

  esgotado boolean not null default false,
  destaque boolean not null default false,
  ordem smallint not null default 0,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- Duas peças com a mesma referência no mesmo site tornavam a mensagem de
  -- WhatsApp ambígua, que é o único sítio onde a referência serve.
  unique (site_id, ref)
);

create index site_products_site_idx
  on public.site_products (site_id, esgotado, ordem, created_at desc);

create index site_products_familia_idx
  on public.site_products (site_id, familia)
  where familia is not null;

create trigger site_products_set_updated_at
  before update on public.site_products
  for each row execute function public.set_updated_at();

alter table public.site_products enable row level security;

create policy "site_products_owner_all"
  on public.site_products for all
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

-- O visitante vê as peças de um site que esteja no ar, pela mesma regra da
-- página inicial: se o site expirou, o catálogo expirou com ele.
create policy "site_products_public_reads_live"
  on public.site_products for select to anon, authenticated
  using (public.is_site_live(site_id));
