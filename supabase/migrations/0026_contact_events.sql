-- ---------------------------------------------------------------------------
-- 0026 — o registo de cada contacto feito, um por linha
--
-- O painel passou a ter um cartão de progresso — contactos de hoje, sequência
-- de dias, contactos por semana — e não havia de onde tirar os números.
--
-- O que existia não chegava, e a razão é subtil: `deal_stage_events` guarda
-- MUDANÇAS DE ETAPA, escritas por trigger. Mas dos três desfechos da fila de
-- contacto só dois mudam a etapa. "Adiado" não muda nada de propósito — quem
-- não atendeu continua por contactar — e portanto o trabalho de ligar a quem
-- não atende não deixava rasto nenhum.
--
-- Contar contactos por `deal_stage_events` dava um número sistematicamente
-- abaixo da verdade, e pior: abaixo da verdade exactamente nos dias maus, em
-- que ninguém atende. Um contador de esforço que castiga os dias difíceis é
-- pior do que não ter contador.
--
-- `deals.last_contacted_at` também não serve: guarda só o ÚLTIMO contacto de
-- cada comércio. Ligar três vezes ao mesmo café em três semanas deixa lá uma
-- data, não três.
--
-- Daí esta tabela: uma linha por contacto feito, com o desfecho e a hora.
-- Não substitui nada — `deals` continua a ser o estado actual e
-- `deal_stage_events` o histórico de etapas. Esta é o histórico de ESFORÇO,
-- que é outra pergunta.
--
-- Sem retroactivos: o que se fez antes de hoje não foi registado e não se
-- inventa. A sequência de dias começa do zero, e é a verdade.
-- ---------------------------------------------------------------------------

create table public.contact_events (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  business_id uuid not null references public.businesses (id) on delete cascade,

  -- Os mesmos três da fila de contacto. Texto e não enum: os desfechos são de
  -- interface e mudam mais depressa do que vale a pena uma migração de tipo.
  outcome text not null check (outcome in ('contactado', 'adiado', 'nao_interessa')),

  -- Por onde foi. Ainda só há um caminho, mas o robô do Instagram e as
  -- instâncias de WhatsApp vêm aí, e saber por onde se falou com alguém é
  -- metade do que se quer perguntar aos dados depois.
  channel text not null default 'manual',

  note text,
  created_at timestamptz not null default now()
);

-- A pergunta que se faz sempre é "o que fiz eu entre tal e tal dia", por dono.
create index contact_events_owner_created_idx
  on public.contact_events (owner_id, created_at desc);

-- E, na ficha, "quantas vezes já liguei a este".
create index contact_events_business_idx
  on public.contact_events (business_id, created_at desc);

alter table public.contact_events enable row level security;

create policy "contact_events_select_own"
  on public.contact_events for select
  using (owner_id = (select auth.uid()));

create policy "contact_events_insert_own"
  on public.contact_events for insert
  with check (owner_id = (select auth.uid()));

-- Sem update nem delete de propósito. Um registo de esforço que se pode
-- reescrever a posteriori não é um registo, é um rascunho — e a sequência de
-- dias deixava de querer dizer alguma coisa.
