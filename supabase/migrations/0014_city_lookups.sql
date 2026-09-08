-- ============================================================================
-- 0014 — city_lookups: procurar qualquer cidade sem pagar duas vezes
--
-- O ecrã de procurar comércios pedia latitude, longitude e raio à mão, e a
-- alternativa era uma lista fechada de vinte cidades. Nenhuma das duas serve:
-- ninguém sabe de cor as coordenadas de Barcelinhos, e a lista deixa de fora
-- praticamente Portugal inteiro e o Brasil todo.
--
-- Agora escreve-se o nome e o Google responde com as cidades que conhece, já
-- com as coordenadas e com a área que a cidade ocupa. Isso é uma chamada paga,
-- e por isso fica gravada: a regra desta casa é que uma consulta paga nunca se
-- repete. A segunda vez que se procurar "Guimarães" a resposta vem daqui.
--
-- A chave é o texto NORMALIZADO — sem acentos, sem maiúsculas, sem espaços a
-- mais — para "Guimaraes", "guimarães" e " Guimarães " serem a mesma pergunta
-- e não três chamadas.
-- ============================================================================

create table public.city_lookups (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid()
    references auth.users (id) on delete cascade,

  -- Pergunta normalizada, calculada pela aplicação (ver lib/places/cities.ts).
  query_key text not null check (btrim(query_key) <> ''),
  -- O que a pessoa escreveu de facto, para se perceber o histórico.
  query_text text not null,
  country_code text not null check (country_code ~ '^[A-Z]{2}$'),

  -- A resposta inteira, já reduzida ao que interessa: uma lista de cidades com
  -- nome, região, coordenadas e raio. Guardada como veio para não ser preciso
  -- outra chamada se um dia se quiser mais campos dela.
  results jsonb not null default '[]'::jsonb,
  results_count integer not null default 0 check (results_count >= 0),

  looked_up_at timestamptz not null default now(),
  created_at timestamptz not null default now(),

  -- A regra anti-desperdício, imposta pelo schema e não pelo código.
  constraint city_lookups_owner_query_unique unique (owner_id, query_key, country_code)
);

comment on table public.city_lookups is
  'Cache das procuras de cidade no Google Places. Consultar antes de chamar a API.';
comment on column public.city_lookups.query_key is
  'Pergunta normalizada (sem acentos nem maiúsculas). Calculada pela aplicação.';

alter table public.city_lookups enable row level security;

create policy "cities: owner reads"   on public.city_lookups
  for select to authenticated using (owner_id = (select public.current_owner_id()));
create policy "cities: owner inserts" on public.city_lookups
  for insert to authenticated with check (owner_id = (select public.current_owner_id()));
create policy "cities: owner updates" on public.city_lookups
  for update to authenticated
  using (owner_id = (select public.current_owner_id()))
  with check (owner_id = (select public.current_owner_id()));
create policy "cities: owner deletes" on public.city_lookups
  for delete to authenticated using (owner_id = (select public.current_owner_id()));
