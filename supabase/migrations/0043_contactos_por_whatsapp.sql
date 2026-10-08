-- A lista de WhatsApp grava o contacto quando se carrega no botão, e deixa
-- desfazê-lo (um toque por engano não pode ficar para sempre a dizer «WhatsApp
-- enviado»). Para isso faltavam duas coisas em `contact_events`:
--
-- 1. Apagar. Só havia políticas de ler e de inserir, por isso o «desfazer»
--    falhava em silêncio — o RLS não dá erro, apaga zero linhas.
-- 2. O dono certo por omissão. Era `auth.uid()`: numa conta de equipa isso é o
--    membro, e a política de inserir (que pede `current_owner_id()`) recusava a
--    linha. Quem não fosse o dono não conseguia registar contacto nenhum, nem
--    na fila. O mesmo acerto que a 0041 fez a `emails_enviados` e `nao_contactar`.

drop policy if exists contact_events_delete_own on public.contact_events;
create policy contact_events_delete_own on public.contact_events for delete to authenticated
  using (owner_id = (select public.current_owner_id()));

alter table public.contact_events alter column owner_id set default public.current_owner_id();
