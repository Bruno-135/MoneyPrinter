-- ---------------------------------------------------------------------------
-- 0021 — "já tem página" como coluna da vista do painel
--
-- O painel passa a filtrar por duas coisas novas: o país e se o comércio já
-- tem landing page gerada.
--
-- O país já era coluna de `businesses` (`country_code`), com índice
-- `(country_code, locality)`, portanto não precisa de nada aqui.
--
-- "Já tem página" é que não existia em lado nenhum consultável. Fazê-lo na
-- aplicação obrigava a ler primeiro todos os `business_id` de `generated_sites`
-- e a passá-los num `in (...)` — que funciona para "tem" e é mau para "não
-- tem", e que não dá para contar nas facetas dos filtros. Como coluna da vista,
-- é `where has_site` e conta-se como qualquer outra.
--
-- O `exists` apoia-se em `generated_sites_owner_business_idx (owner_id,
-- business_id)`, e a RLS de `generated_sites` já limita a consulta ao dono,
-- portanto o índice serve tal como está.
--
-- `has_live_site` vem junto por ser a mesma passagem à tabela: uma página
-- gerada e uma página que o cliente consegue mesmo abrir são coisas
-- diferentes, e a segunda é a que interessa quando se lhe manda o link.
--
-- A vista recria-se inteira porque `create or replace view` não deixa
-- acrescentar colunas no meio nem mudar a lista de saída. Continua com
-- `security_invoker = on`: corre com os direitos de quem consulta, portanto a
-- RLS das tabelas de baixo aplica-se na mesma.
-- ---------------------------------------------------------------------------

drop view if exists public.businesses_with_stage;

create view public.businesses_with_stage
with (security_invoker = on)
as
select
  b.*,
  coalesce(d.stage, 'new'::public.deal_stage) as stage,
  d.next_action_at,
  d.notes as deal_notes,
  exists (
    select 1 from public.generated_sites g
    where g.business_id = b.id
  ) as has_site,
  exists (
    select 1 from public.generated_sites g
    where g.business_id = b.id
      and g.status = 'published'
      and g.expires_at > now()
  ) as has_live_site
from public.businesses b
left join public.deals d on d.business_id = b.id;

comment on view public.businesses_with_stage is
  'Comércios com o estado da negociação como coluna, e se já têm landing page gerada (has_site) e no ar (has_live_site). Sem linha em deals, o estado é new. Respeita a RLS (security_invoker).';
