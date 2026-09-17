-- ---------------------------------------------------------------------------
-- 0029 — uma referência curta por cliente
--
-- O `public_code` que já existe (`fqvxsb5epu`) serve o link público e é feito
-- para não se adivinhar: dez caracteres ao acaso. Serve para isso e só para
-- isso. Ninguém dita aquilo ao telefone nem o escreve numa fatura.
--
-- Esta é a outra metade: um número curto, legível e dizível — CLI-0001 — para
-- identificar o cliente em faturas, no WhatsApp, em pastas e numa chamada.
-- São duas necessidades opostas: uma quer ser impossível de adivinhar, a
-- outra quer ser fácil de repetir. Por isso são duas colunas e não uma.
--
-- Quando nasce: na PRIMEIRA venda. Não à entrada no sistema — há 3745
-- comércios varridos e dar número a todos tornava o número inútil, porque
-- deixava de querer dizer "cliente". `client_services` é o que define um
-- cliente nesta aplicação (é de lá que sai a carteira), logo é de lá que sai
-- o gatilho.
--
-- Sequencial por dono, não global: o primeiro cliente de cada pessoa é o
-- CLI-0001 dela. Um contador partilhado faria o segundo utilizador começar no
-- 43 e revelaria de passagem quantos clientes o primeiro tem.
--
-- Cancelar um serviço não devolve o número. Um cliente que sai e volta é o
-- mesmo cliente, e uma referência reaproveitada faria duas faturas de anos
-- diferentes apontar para comércios diferentes.
-- ---------------------------------------------------------------------------

alter table public.businesses
  add column client_code text;

-- Único por dono e não global: dois utilizadores têm ambos um CLI-0001, e
-- devem ter. `null` repete-se à vontade num índice único, que é o que se quer
-- para os milhares que ainda não são clientes.
create unique index businesses_owner_client_code_key
  on public.businesses (owner_id, client_code)
  where client_code is not null;

-- ---------------------------------------------------------------------------
-- O contador, um por dono.
--
-- Guardar o último número em vez de contar `max(client_code)` de cada vez: o
-- máximo desce quando se apaga o último cliente, e o número seguinte sairia
-- repetido — a apontar para uma fatura que já foi passada.
-- ---------------------------------------------------------------------------

create table public.client_code_counters (
  owner_id uuid primary key references auth.users (id) on delete cascade,
  last_number integer not null default 0,
  updated_at timestamptz not null default now()
);

alter table public.client_code_counters enable row level security;

-- Só de leitura para quem é dono. Escrever é trabalho do gatilho, que corre
-- como SECURITY DEFINER — ninguém deve poder pôr o contador onde quer.
create policy "client_code_counters_select_own"
  on public.client_code_counters for select
  using (owner_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- A atribuição.
-- ---------------------------------------------------------------------------

create or replace function public.next_client_code(p_owner uuid)
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  n integer;
begin
  -- Um único comando faz o incremento: ler e escrever em passos separados
  -- deixava duas vendas simultâneas a levar o mesmo número, e o índice único
  -- rejeitaria a segunda venda — perder uma venda por causa de uma etiqueta
  -- seria trocar o essencial pelo acessório.
  insert into public.client_code_counters (owner_id, last_number)
    values (p_owner, 1)
  on conflict (owner_id) do update
    set last_number = public.client_code_counters.last_number + 1,
        updated_at  = now()
  returning last_number into n;

  -- Quatro casas chegam para 9999 clientes e mantêm a coluna alinhada quando
  -- se lê de cima a baixo. A partir daí cresce sozinho, sem partir nada.
  return 'CLI-' || lpad(n::text, 4, '0');
end;
$$;

create or replace function public.assign_client_code()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  -- `where client_code is null` faz o trabalho todo: a segunda venda ao mesmo
  -- comércio não mexe em nada, e o contador só avança quando houve mesmo um
  -- cliente novo.
  update public.businesses
     set client_code = public.next_client_code(new.owner_id)
   where id = new.business_id
     and owner_id = new.owner_id
     and client_code is null;

  return new;
end;
$$;

-- Só no INSERT. `registarServico` faz upsert, e corrigir o valor de um serviço
-- já vendido cai no ramo do UPDATE — não é um cliente novo.
create trigger client_services_assign_code
  after insert on public.client_services
  for each row
  execute function public.assign_client_code();

-- Pela convenção de 0009: as funções de trigger e as auxiliares não têm de
-- estar na API pública.
revoke execute on function public.assign_client_code()      from public, anon, authenticated;
revoke execute on function public.next_client_code(uuid)    from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Os clientes que já existem.
--
-- Numerados pela data da primeira venda, não pela ordem em que a base de dados
-- os devolve: quem comprou primeiro é o CLI-0001, que é a única ordem que uma
-- pessoa consegue explicar.
-- ---------------------------------------------------------------------------

with primeiros as (
  select owner_id,
         business_id,
         min(sold_at) as desde
    from public.client_services
   group by owner_id, business_id
),
numerados as (
  select owner_id,
         business_id,
         row_number() over (partition by owner_id order by desde, business_id) as n
    from primeiros
)
update public.businesses b
   set client_code = 'CLI-' || lpad(numerados.n::text, 4, '0')
  from numerados
 where b.id = numerados.business_id
   and b.owner_id = numerados.owner_id
   and b.client_code is null;

-- E o contador fica onde o retroactivo o deixou, senão o cliente seguinte
-- levava o CLI-0001 outra vez.
insert into public.client_code_counters (owner_id, last_number)
select owner_id, count(*)
  from public.businesses
 where client_code is not null
 group by owner_id
on conflict (owner_id) do update
  set last_number = excluded.last_number;
