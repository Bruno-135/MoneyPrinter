-- O pedido passa a dizer se o aviso por email saiu.
--
-- Chegou o primeiro pedido pelo site e o email não apareceu. Fui ao log do
-- servidor à procura da razão e não estava lá nada: o envio do aviso só
-- escrevia no log quando REBENTAVA, e os dois casos mais prováveis — a chave
-- não estar posta e a Resend recusar com um código — ou eram calados ou
-- ficavam num log que não se consegue ler de fora.
--
-- Um aviso que falha sem deixar rasto é pior do que não haver aviso: ficas à
-- espera de um email que nunca vem e o pedido apodrece no painel. Então o
-- resultado do envio passa a ficar guardado na própria linha do pedido, que é
-- o sítio onde se vai olhar de qualquer maneira.

alter table public.pedidos
  add column if not exists aviso text
    check (aviso in ('enviado', 'sem-chave', 'falhou')),
  add column if not exists aviso_em timestamptz,
  add column if not exists aviso_detalhe text;

comment on column public.pedidos.aviso is
  'Se o email de aviso saiu: enviado, sem-chave (falta a RESEND_API_KEY) ou falhou.';
comment on column public.pedidos.aviso_detalhe is
  'O que a Resend respondeu quando recusou, ou o id da mensagem quando aceitou.';

-- Quem preenche o formulário não tem sessão, e a tabela não está aberta a
-- anónimos: a marca do aviso entra pela mesma porta que o pedido entrou.
--
-- Só deixa marcar um pedido dos últimos dez minutos. Sem isso, qualquer um
-- podia reescrever a marca de qualquer pedido — não é grave, é um campo de
-- diagnóstico, mas não há razão para deixar aberto o que se pode fechar.
create or replace function public.marcar_aviso(
  p_id uuid,
  p_estado text,
  p_detalhe text default null
) returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if p_estado not in ('enviado', 'sem-chave', 'falhou') then
    raise exception 'estado de aviso desconhecido: %', p_estado;
  end if;

  update public.pedidos
     set aviso = p_estado,
         aviso_em = now(),
         aviso_detalhe = left(p_detalhe, 500)
   where id = p_id
     and created_at > now() - interval '10 minutes';
end $$;

revoke all on function public.marcar_aviso(uuid, text, text) from public;
grant execute on function public.marcar_aviso(uuid, text, text) to anon, authenticated;
