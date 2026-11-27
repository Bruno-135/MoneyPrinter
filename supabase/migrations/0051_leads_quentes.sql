-- Leads quentes do WhatsApp: a área onde fica quem mostrou interesse.
--
-- Uma conversa entra na área quando o robô a marca quente, quando passa ao
-- Bruno, ou quando alguém lhe dá uma etapa à mão. A etapa é do LEAD do
-- WhatsApp — novo, em andamento, negociando, fechado, recusado — e, quando a
-- conversa é de um lead da base (`business_id`), espelha-se no funil
-- (`deals.stage`) a partir da aplicação, para os dois ecrãs não discordarem.
-- `nome` serve quem não é lead da base (números colados, testes); `notas` é
-- o que se combinou.

alter table public.whatsapp_conversas
  add column if not exists etapa text not null default 'novo'
    check (etapa in ('novo', 'em_andamento', 'negociando', 'fechado', 'recusado')),
  add column if not exists etapa_em timestamptz,
  add column if not exists nome text,
  add column if not exists notas text;

create index if not exists whatsapp_conversas_quentes_idx
  on public.whatsapp_conversas (owner_id, etapa)
  where quente or humano_desde is not null or etapa <> 'novo';
