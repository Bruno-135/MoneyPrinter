-- ---------------------------------------------------------------------------
-- 0028 — o estado de pagamento de cada mês
--
-- O QUE cada cliente paga já está em `client_services`: o serviço, o valor, a
-- moeda, e se é mensal. O que faltava era saber se o mês está pago.
--
-- Repare-se no que esta tabela NÃO tem: a lista de serviços cobrados. Isso
-- seria copiar a verdade para um segundo sítio, e dois sítios com a mesma
-- verdade acabam sempre a discordar. As mensalidades de um mês CALCULAM-SE a
-- partir de `client_services` — quem tinha serviço activo naquele mês — e aqui
-- guarda-se apenas o desfecho.
--
-- `amount_cents` é a excepção a essa regra, e de propósito: fica congelado no
-- momento em que se marca. Se em Janeiro ele pagava 30 € e em Abril passou a
-- pagar 45, o mês de Janeiro tem de continuar a dizer 30 para sempre. Um
-- histórico que se recalcula com os preços de hoje não é um histórico.
--
-- `period` é o primeiro dia do mês, e não um mês em texto: com data, o Postgres
-- ordena, compara e filtra por intervalos sem nenhum truque.
--
-- Não há linha para o mês que ainda ninguém tocou. "Sem linha" quer dizer
-- pendente, do mesmo modo que um comércio sem linha em `deals` está por
-- contactar. Criar linhas para tudo obrigava a um trabalho mensal que mais cedo
-- ou mais tarde falhava em silêncio.
-- ---------------------------------------------------------------------------

create table public.client_payments (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  business_id uuid not null references public.businesses (id) on delete cascade,

  -- Primeiro dia do mês a que diz respeito.
  period date not null,

  -- Congelado quando se marca. Ver acima.
  amount_cents integer not null check (amount_cents >= 0),
  currency text not null default 'EUR',

  status text not null check (status in ('pago', 'falhou', 'pendente')),

  -- Quando entrou o dinheiro. Só faz sentido em 'pago'.
  paid_at timestamptz,

  note text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- Um cliente, um mês, um estado. Sem isto, carregar duas vezes no botão dava
  -- duas linhas e o total do mês passava a contar a dobrar.
  unique (business_id, period)
);

create index client_payments_owner_period_idx
  on public.client_payments (owner_id, period desc);

create trigger client_payments_set_updated_at
  before update on public.client_payments
  for each row execute function public.set_updated_at();

alter table public.client_payments enable row level security;

create policy "client_payments_select_own"
  on public.client_payments for select
  using (owner_id = (select auth.uid()));

create policy "client_payments_insert_own"
  on public.client_payments for insert
  with check (owner_id = (select auth.uid()));

create policy "client_payments_update_own"
  on public.client_payments for update
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

create policy "client_payments_delete_own"
  on public.client_payments for delete
  using (owner_id = (select auth.uid()));
