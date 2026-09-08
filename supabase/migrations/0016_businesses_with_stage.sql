-- ---------------------------------------------------------------------------
-- 0016 — businesses_with_stage: o estado da negociação como uma coluna
--
-- A lista do painel lia os comércios e trazia a negociação embutida
-- (`deals(stage)`). Isso serve para MOSTRAR, mas não serve para FILTRAR: no
-- PostgREST, um filtro sobre uma tabela embutida decide que linhas filhas vêm
-- agarradas, e não que linhas-mãe aparecem. Filtrar por "Por contactar"
-- devolvia na mesma todos os comércios — os outros vinham com a negociação
-- vazia e, sem ela, a aplicação lia-os como "por contactar". O filtro parecia
-- funcionar e estava a mentir.
--
-- Com o estado como coluna de uma vista, filtrar é `where stage in (...)`, que
-- não tem como enganar ninguém. E deixa de ser preciso repetir a mesma regra em
-- dois sítios: um comércio SEM linha em `deals` conta como 'new', e passa a ser
-- a base de dados a dizê-lo, uma vez, aqui.
--
-- `security_invoker = on` faz a vista correr com os direitos de quem consulta,
-- portanto a RLS das tabelas de baixo aplica-se.
-- ---------------------------------------------------------------------------

create view public.businesses_with_stage
with (security_invoker = on)
as
select
  b.*,
  coalesce(d.stage, 'new'::public.deal_stage) as stage,
  d.next_action_at,
  d.notes as deal_notes
from public.businesses b
left join public.deals d on d.business_id = b.id;

comment on view public.businesses_with_stage is
  'Comércios com o estado da negociação como coluna. Sem linha em deals, o estado é new. Respeita a RLS (security_invoker).';
