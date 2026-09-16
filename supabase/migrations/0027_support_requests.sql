-- ---------------------------------------------------------------------------
-- 0027 — os pedidos dos clientes que já pagam
--
-- Numa agência de mensalidades, o dinheiro não se perde na venda: perde-se
-- depois. O cliente pede para trocar uma foto, para mudar o horário de Domingo,
-- para publicar a promoção de Setembro. Se esse pedido ficar numa conversa de
-- WhatsApp entre outras cinquenta, não se faz. E um pedido que não se faz é uma
-- mensalidade cancelada três meses mais tarde, sem ninguém perceber porquê.
--
-- Daí uma tabela, e não uma etiqueta em `deals`: um cliente tem muitos pedidos
-- ao longo do tempo, e o que interessa de cada um é o PRAZO.
--
-- `due_at` é o compromisso, `closed_at` é quando ficou feito. Com os dois há a
-- única pergunta que importa: fechou-se a tempo? Não se guarda um
-- "fechado_no_prazo" calculado — seria um terceiro sítio a guardar a mesma
-- verdade, e mais cedo ou mais tarde discordava dos outros dois.
--
-- `service_slug` liga ao catálogo (site, ficha-google, cardápio…) e pode ficar
-- nulo: nem todo o pedido é sobre um serviço concreto.
--
-- SEM responsável por enquanto. A equipa ainda é uma pessoa, e uma coluna que
-- só pode ter um valor não é informação — é uma coluna à espera. Entra quando
-- houver equipa a sério, na mesma migração que os papéis.
-- ---------------------------------------------------------------------------

create table public.support_requests (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  business_id uuid not null references public.businesses (id) on delete cascade,

  -- O que ele pediu, nas palavras dele. Uma linha.
  title text not null check (length(trim(title)) > 0),
  details text,

  -- A que serviço diz respeito, quando diz. Texto solto e não chave
  -- estrangeira: o catálogo vive no código e muda sem migração.
  service_slug text,

  -- Por onde chegou. Quase sempre WhatsApp, mas saber a origem é o que permite
  -- responder um dia à pergunta "de onde vem o trabalho que não facturo".
  origin text not null default 'whatsapp',

  -- Quando é que ficou de estar feito. Obrigatório de propósito: um pedido sem
  -- prazo é um pedido que fica para depois para sempre.
  due_at timestamptz not null,

  closed_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- A lista abre-se sempre pelo prazo, e quase sempre só com os abertos.
create index support_requests_owner_due_idx
  on public.support_requests (owner_id, due_at)
  where closed_at is null;

-- E na ficha do cliente, tudo o que ele já pediu.
create index support_requests_business_idx
  on public.support_requests (business_id, created_at desc);

create trigger support_requests_set_updated_at
  before update on public.support_requests
  for each row execute function public.set_updated_at();

alter table public.support_requests enable row level security;

create policy "support_requests_select_own"
  on public.support_requests for select
  using (owner_id = (select auth.uid()));

create policy "support_requests_insert_own"
  on public.support_requests for insert
  with check (owner_id = (select auth.uid()));

create policy "support_requests_update_own"
  on public.support_requests for update
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

create policy "support_requests_delete_own"
  on public.support_requests for delete
  using (owner_id = (select auth.uid()));
