-- ---------------------------------------------------------------------------
-- 0023 — contar as facetas na base de dados, e não na aplicação
--
-- As caixas de filtro do painel mostram quantos há de cada valor. Isso era
-- feito a trazer as linhas para a aplicação e a contá-las em JavaScript, com
-- um `.limit(5000)` que parecia generoso. Não era: o PostgREST corta as
-- respostas às 1000 linhas por omissão, e o limite pedido nem chega a ser
-- considerado. A partir daí toda a contagem mentia.
--
-- Com 2603 comércios guardados, o painel dizia "Por contactar: 1000" e
-- "Sem site: 623" quando eram 2603 e 1566. E o erro não era só nos números:
-- um ramo cujos comércios caíssem todos depois da milésima linha DESAPARECIA
-- do funil, porque nunca chegava cá para ser contado. Um filtro que esconde
-- opções é pior do que um filtro que conta mal.
--
-- Contar é trabalho de base de dados. Um `group by` devolve cinco linhas em
-- vez de 2603, é exato por construção, e não tem limite nenhum a atravessar-se
-- à frente.
--
-- A função é `security invoker` (o que está por omissão): corre com os
-- direitos de quem chama, portanto a RLS de `businesses` continua a decidir o
-- que se conta. `stable` porque só lê.
--
-- `p_field` é um texto, mas as colunas possíveis são cinco e estão escritas à
-- mão no `case`. Um valor que não seja nenhuma delas devolve zero linhas — não
-- há SQL montado por concatenação aqui, e por isso não há nada a injetar.
-- ---------------------------------------------------------------------------

create or replace function public.facet_counts(
  p_field text,
  p_kinds text[] default null,
  p_stages text[] default null,
  p_categories text[] default null,
  p_countries text[] default null,
  p_has_site boolean default null,
  p_region_id uuid default null
)
returns table (value text, count bigint)
language sql
stable
as $$
  select
    case p_field
      when 'website_kind'      then b.website_kind::text
      when 'stage'             then b.stage::text
      when 'business_category' then b.business_category
      when 'country_code'      then b.country_code
      when 'has_site'          then b.has_site::text
    end as value,
    count(*) as count
  from public.businesses_with_stage b
  where b.is_archived = false
    -- Cada filtro só entra quando lhe é passado alguma coisa. `null` quer
    -- dizer "não filtrar por isto", nunca "não mostrar nada".
    and (p_kinds      is null or cardinality(p_kinds)      = 0 or b.website_kind::text = any (p_kinds))
    and (p_stages     is null or cardinality(p_stages)     = 0 or b.stage::text        = any (p_stages))
    and (p_categories is null or cardinality(p_categories) = 0 or b.business_category   = any (p_categories))
    and (p_countries  is null or cardinality(p_countries)  = 0 or b.country_code        = any (p_countries))
    and (p_has_site   is null or b.has_site = p_has_site)
    and (p_region_id  is null or b.region_id = p_region_id)
  group by 1
  -- Fora o grupo do `case` que não acertou em coluna nenhuma: um `p_field`
  -- desconhecido não pode devolver uma linha sem nome com a contagem total.
  having case p_field
           when 'website_kind'      then b.website_kind::text
           when 'stage'             then b.stage::text
           when 'business_category' then b.business_category
           when 'country_code'      then b.country_code
           when 'has_site'          then b.has_site::text
         end is not null
  order by 1;
$$;

comment on function public.facet_counts is
  'Quantos comércios há de cada valor de uma coluna, dentro dos filtros dados. Substitui a contagem feita na aplicação, que lia no máximo 1000 linhas e por isso mentia acima disso.';

revoke all on function public.facet_counts from public;
grant execute on function public.facet_counts to authenticated;
