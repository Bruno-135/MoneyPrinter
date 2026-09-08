-- ---------------------------------------------------------------------------
-- 0015 — índice para a ordem "encontrados há menos tempo"
--
-- A lista de prospetos passou a poder ordenar-se por data além do score. Com
-- quinhentos comércios isto não se nota; a razão de existir é a mesma do índice
-- irmão da migração 0013 — quando forem cinco mil, cada troca de ordem no ecrã
-- deixa de varrer a tabela inteira.
--
-- Parcial em `is_archived = false` porque é sempre assim que a consulta filtra:
-- um índice que inclua as linhas arquivadas seria maior e nunca usado para elas.
-- ---------------------------------------------------------------------------

create index if not exists businesses_recent_idx
  on public.businesses (owner_id, last_synced_at desc)
  where is_archived = false;
