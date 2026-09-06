-- ============================================================================
-- 0001 — Extensões, tipos enumerados e funções auxiliares
--
-- Base partilhada por todas as migrações seguintes. Nada de tabelas aqui.
-- ============================================================================

create extension if not exists "pgcrypto" with schema extensions;

-- ----------------------------------------------------------------------------
-- Tipos enumerados
-- ----------------------------------------------------------------------------

-- Modelo da landing page gerada.
--   standard      -> comércio genérico (loja, cabeleireiro, oficina, ...)
--   food_service  -> restaurantes E padarias: leva cardápio e pedido por WhatsApp
create type public.site_template as enum ('standard', 'food_service');

create type public.site_status as enum ('draft', 'published', 'expired', 'archived');

-- Estados da negociação. A ordem da declaração é a ordem do funil.
create type public.deal_stage as enum (
  'new',                -- acabou de sair da busca, ainda não foi contactado
  'contacted',          -- primeiro contacto feito
  'meeting_scheduled',  -- reunião marcada
  'proposal_sent',      -- proposta/landing page apresentada
  'negotiating',        -- a negociar preço ou âmbito
  'won',                -- fechou
  'lost',               -- não fechou
  'on_hold'             -- adiado por decisão do comércio
);

-- O que foi clicado numa landing page pública.
create type public.click_target as enum (
  'whatsapp',
  'phone',
  'email',
  'directions',
  'menu_item',
  'social',
  'external_link',
  'other'
);

-- ----------------------------------------------------------------------------
-- Funções auxiliares
--
-- Todas com `search_path = ''` e referências qualificadas: sem isto, um
-- utilizador podia criar um objeto com o mesmo nome noutro schema e sequestrar
-- a execução da função.
-- ----------------------------------------------------------------------------

-- Mantém `updated_at` atualizado sem depender da aplicação se lembrar.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

comment on function public.set_updated_at() is
  'Trigger BEFORE UPDATE: escreve now() em updated_at.';

-- Código público aleatório para os URL das landing pages.
--
-- Alfabeto sem 0/1/l/o para não haver confusão quando alguém lê o link em voz
-- alta ou o copia de um papel. 32^10 ~ 1.1e15 combinações: não se adivinha, e
-- não revela quantos sites já foram gerados (ao contrário de um id sequencial).
create or replace function public.generate_public_code(p_length integer default 10)
returns text
language plpgsql
volatile
set search_path = ''
as $$
declare
  alphabet constant text := 'abcdefghijkmnpqrstuvwxyz23456789';
  result text := '';
  i integer;
begin
  if p_length < 6 then
    raise exception 'p_length tem de ser pelo menos 6 (recebido: %)', p_length;
  end if;

  for i in 1..p_length loop
    result := result || substr(alphabet, 1 + floor(random() * length(alphabet))::integer, 1);
  end loop;

  return result;
end;
$$;

comment on function public.generate_public_code(integer) is
  'Código aleatório não sequencial para URL públicos de landing pages.';

-- Dono da linha. Existe como função para que, no dia em que houver equipas,
-- a regra de "quem é o dono" mude num sítio só em vez de em ~30 políticas.
create or replace function public.current_owner_id()
returns uuid
language sql
stable
set search_path = ''
as $$
  select auth.uid();
$$;

comment on function public.current_owner_id() is
  'Dono efetivo do pedido atual. Ponto único de mudança para futuro modo equipa.';
