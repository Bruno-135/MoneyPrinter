-- ---------------------------------------------------------------------------
-- 0034 — o formulário passa a perguntar o RAMO e não o modelo
--
-- A dona da padaria não sabe o que é o "Forno & Brasa". Sabe que tem uma
-- padaria. Pedir-lhe o nome de um modelo que ela viu de passagem noutra
-- página é pedir-lhe trabalho que é nosso: quem escolhe o modelo somos nós,
-- e escolhemo-lo melhor sabendo o ramo.
--
-- A coluna muda de nome com ela. Podia ficar `modelo` a guardar um ramo — e
-- daqui a três meses ninguém saberia o que lá está dentro.
--
-- Zero linhas na tabela quando isto correu, portanto não há nada a converter.
-- ---------------------------------------------------------------------------

alter table public.pedidos rename column modelo to ramo;

-- A função tem de mudar de assinatura, e uma função com outra assinatura é
-- outra função: a antiga sai, senão ficavam as duas e o PostgREST teria de
-- adivinhar qual.
drop function if exists public.registar_pedido(text, text, text, text, text);

create or replace function public.registar_pedido(
  p_negocio text,
  p_contacto text,
  p_pedido text,
  p_ramo text default null,
  p_prazo text default null
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_dono uuid;
  v_id uuid;
begin
  v_dono := public.dono_da_agencia();
  if v_dono is null then
    raise exception 'não há dono a quem entregar o pedido';
  end if;

  if coalesce(trim(p_negocio), '') = ''
     or coalesce(trim(p_contacto), '') = ''
     or coalesce(trim(p_pedido), '') = '' then
    raise exception 'faltam campos obrigatórios';
  end if;

  insert into public.pedidos (owner_id, negocio, contacto, pedido, ramo, prazo)
  values (
    v_dono,
    left(trim(p_negocio), 200),
    left(trim(p_contacto), 200),
    left(trim(p_pedido), 4000),
    left(nullif(trim(coalesce(p_ramo, '')), ''), 100),
    left(nullif(trim(coalesce(p_prazo, '')), ''), 200)
  )
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.registar_pedido(text, text, text, text, text) from public;
grant execute on function public.registar_pedido(text, text, text, text, text) to anon, authenticated;

comment on column public.pedidos.ramo is
  'O ramo do negócio, escolhido pela pessoa no formulário. O modelo escolhemos nós.';
