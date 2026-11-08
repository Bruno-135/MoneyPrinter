-- O «não quero receber mais» dos e-mails de abordagem, de volta.
--
-- A 0041 criou esta função e a 0042 tirou-a, quando se decidiu não enviar
-- e-mails. Voltou a haver envio (um e-mail de cada vez, a partir da folha de
-- e-mails, só quando se carrega em «Enviar»), e cada e-mail tem de levar a
-- maneira de sair: é a lei, e é o que separa um e-mail de abordagem de spam.
--
-- Quem clica não tem sessão, por isso não passa pelas políticas de linha. A
-- função é `security definer` e faz UMA coisa: põe na lista de não contactar o
-- endereço do e-mail com aquele id. O id é o `id` da linha de `emails_enviados`,
-- um uuid aleatório que só existe dentro do e-mail recebido. Guarda o ENDEREÇO
-- e não só o negócio, para ficar de fora mesmo que a caixa apareça noutro lead.
--
-- Sem chave de serviço na aplicação, de propósito (ver 0038).

create or replace function public.cancelar_subscricao(p_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  linha public.emails_enviados;
begin
  select * into linha from public.emails_enviados where id = p_id;
  if not found then
    return false;
  end if;

  insert into public.nao_contactar (owner_id, business_id, email, motivo)
  values (linha.owner_id, linha.business_id, lower(linha.para), 'pediu para sair (link do e-mail)')
  on conflict do nothing;

  return true;
end;
$$;

revoke all on function public.cancelar_subscricao(uuid) from public;
grant execute on function public.cancelar_subscricao(uuid) to anon, authenticated;
