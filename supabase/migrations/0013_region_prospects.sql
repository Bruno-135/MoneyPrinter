-- ---------------------------------------------------------------------------
-- 0013 — region_prospects: cada varrimento com as suas contas
--
-- A lista de prospetos mostrava tudo o que alguma vez foi encontrado, ordenado
-- por score. Com dois varrimentos feitos, as padarias de Braga e os
-- cabeleireiros apareciam intercalados, e não havia maneira de ver só o que
-- tinha acabado de sair da última procura.
--
-- A informação para os separar já existia: `businesses.region_id` aponta para
-- a linha de `searched_regions` do varrimento que encontrou o comércio. Faltava
-- poder contá-los sem trazer todas as linhas para a aplicação — que é o que
-- esta vista faz.
--
-- Nota sobre `region_id`: um comércio encontrado por dois varrimentos fica com
-- o do ÚLTIMO. É o que faz sentido para um filtro que responde a "o que é que
-- esta procura me deu": a resposta é o que ela encontrou agora, incluindo o que
-- já era conhecido de antes.
--
-- `security_invoker = on` faz a vista correr com os direitos de quem consulta,
-- portanto a RLS das tabelas de baixo aplica-se. Sem isto, devolveria as contas
-- de todos os donos.
-- ---------------------------------------------------------------------------

create view public.region_prospects
with (security_invoker = on)
as
select
  r.owner_id,
  r.id                as region_id,
  r.label,
  r.business_category,
  r.country_code,
  r.locality,
  r.last_searched_at,
  r.search_count,
  count(b.id)                                                    as businesses,
  count(b.id) filter (where b.website_kind is distinct from 'real') as prospects,
  count(b.id) filter (where b.website_kind = 'none')             as without_site,
  count(b.id) filter (where b.website_kind = 'social_only')      as social_only
from public.searched_regions r
left join public.businesses b
  on  b.region_id = r.id
  and b.is_archived = false
group by r.owner_id, r.id;

comment on view public.region_prospects is
  'Cada varrimento (zona + ramo) com quantos comércios e prospetos deu. Respeita a RLS (security_invoker).';

-- O filtro por varrimento faz `where region_id = ...` sobre a mesma consulta
-- que já filtra por prospeto e ordena por score. Sem este índice, cada troca de
-- separador varria a tabela inteira.
create index if not exists businesses_region_score_idx
  on public.businesses (owner_id, region_id, score desc)
  where is_archived = false;
