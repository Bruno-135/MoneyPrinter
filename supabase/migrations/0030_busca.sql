-- ---------------------------------------------------------------------------
-- 0030 — procurar um comércio pelo nome
--
-- Há 3745 comércios na base e não havia nenhuma forma de encontrar um. Nem
-- pelo nome, nem pelo telefone, nem pela referência que a 0029 acabou de
-- criar. Quem recebe uma mensagem a dizer "é o CLI-0042" ou "a padaria da
-- Ançã" não tinha por onde começar.
--
-- A normalização é feita com `translate` e `regexp_replace`, e não com o
-- `unaccent`: o `unaccent` é STABLE e não IMMUTABLE — depende de um
-- dicionário que se pode alterar — e por isso não pode entrar nem numa coluna
-- gerada nem num índice. `translate` é imutável e resolve o mesmo problema
-- para o que aqui interessa, que é português e espanhol.
--
-- Coluna gerada e não uma vista: o índice tem de existir sobre alguma coisa
-- que a base de dados mantenha sozinha. Escrita à mão pelo código, mais cedo
-- ou mais tarde havia uma actualização que se esquecia dela.
-- ---------------------------------------------------------------------------

create extension if not exists pg_trgm with schema extensions;

-- ---------------------------------------------------------------------------
-- Minúsculas e sem acentos. Uma pessoa que escreve "ança" tem de encontrar
-- "Ançã", e quem escreve "PADARIA" tem de encontrar "Padaria".
-- ---------------------------------------------------------------------------
create or replace function public.normalizar_procura(t text)
returns text
language sql
immutable
strict
parallel safe
set search_path = pg_catalog
as $$
  select translate(
    lower(t),
    'áàâãäéèêëíìîïóòôõöúùûüçñÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇÑ',
    'aaaaaeeeeiiiiooooouuuucnaaaaaeeeeiiiiooooouuuucn'
  )
$$;

-- Só os algarismos. O telefone está gravado como "912 345 678" e como
-- "+351912345678", e ninguém escreve nenhuma das duas formas à procura.
create or replace function public.so_digitos(t text)
returns text
language sql
immutable
parallel safe
set search_path = pg_catalog
as $$
  select regexp_replace(coalesce(t, ''), '[^0-9]', '', 'g')
$$;

alter table public.businesses
  add column procura_texto text
  generated always as (
    public.normalizar_procura(name)
    || ' ' || public.normalizar_procura(coalesce(locality, ''))
    || ' ' || public.normalizar_procura(coalesce(admin_area, ''))
    || ' ' || lower(coalesce(client_code, ''))
    || ' ' || public.so_digitos(phone_e164)
    || ' ' || public.so_digitos(phone_raw)
  ) stored;

-- GIN de trigramas: é o que serve um `%texto%` no meio da palavra. Um btree
-- não servia — só apanharia o princípio.
create index businesses_procura_idx
  on public.businesses
  using gin (procura_texto extensions.gin_trgm_ops);

-- As funções são auxiliares do servidor e das políticas, não endereços da API.
revoke execute on function public.normalizar_procura(text) from anon;
revoke execute on function public.so_digitos(text)          from anon;
