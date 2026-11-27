-- O robô escreve em vários balões curtos, como uma pessoa no WhatsApp.
--
-- `whatsapp_robo_resultado` ganha `p_partes` (jsonb: [{texto, id}]): cada
-- balão enviado fica como uma mensagem própria, com o seu id da Evolution e
-- `origem = 'robo'`. `p_texto` continua a ser o texto todo (conta como UMA
-- resposta para o máximo por conversa) e serve as chamadas antigas.

drop function if exists public.whatsapp_robo_resultado(uuid, uuid, text, text, text, boolean, boolean, boolean, text);

create or replace function public.whatsapp_robo_resultado(
  p_token uuid,
  p_conversa uuid,
  p_tipo text,
  p_texto text default null,
  p_mensagem_id text default null,
  p_quente boolean default false,
  p_humano boolean default false,
  p_sair boolean default false,
  p_motivo text default null,
  p_partes jsonb default null
)
returns table (avisar boolean, avisar_numero text, instancia text, numero text, nome text)
language plpgsql
security definer
set search_path = public
as $$
#variable_conflict use_column
declare
  v public.whatsapp_conversas;
  r public.whatsapp_robo;
  ja_quente boolean;
  ja_humano boolean;
  parte jsonb;
begin
  if not exists (select 1 from public.whatsapp_sistema where token_do_motor = p_token) then
    return;
  end if;
  select * into v from public.whatsapp_conversas where id = p_conversa for update;
  if not found then
    return;
  end if;
  select * into r from public.whatsapp_robo where owner_id = v.owner_id;
  ja_quente := v.quente;
  ja_humano := v.humano_desde is not null;

  if p_partes is not null and jsonb_typeof(p_partes) = 'array' then
    for parte in select * from jsonb_array_elements(p_partes) loop
      insert into public.whatsapp_mensagens
        (owner_id, chip_id, numero, business_id, de_mim, texto, mensagem_id, origem, lida)
      values (v.owner_id, v.chip_id, v.numero, v.business_id, true, left(parte ->> 'texto', 4000),
              left(parte ->> 'id', 200), 'robo', true)
      on conflict (chip_id, mensagem_id) where mensagem_id is not null
      do update set origem = 'robo';
    end loop;
  elsif p_texto is not null and length(trim(p_texto)) > 0 then
    insert into public.whatsapp_mensagens
      (owner_id, chip_id, numero, business_id, de_mim, texto, mensagem_id, origem, lida)
    values (v.owner_id, v.chip_id, v.numero, v.business_id, true, left(p_texto, 4000),
            left(p_mensagem_id, 200), 'robo', true)
    on conflict (chip_id, mensagem_id) where mensagem_id is not null
    do update set origem = 'robo';
  end if;

  update public.whatsapp_conversas
  set a_responder_desde = null,
      respostas_robo = respostas_robo + case when p_texto is not null then 1 else 0 end,
      ultima_saida_em = case when p_texto is not null then now() else ultima_saida_em end,
      seguimento_feito = seguimento_feito or p_tipo = 'seguimento',
      seguimento_em = case
        when p_tipo = 'seguimento' or p_humano or p_sair or not coalesce(r.seguimento, false) or seguimento_feito then null
        when p_texto is not null then now() + make_interval(hours => r.seguimento_horas)
        else seguimento_em
      end,
      quente = quente or p_quente,
      quente_em = case when p_quente and not quente then now() else quente_em end,
      motivo = coalesce(nullif(left(p_motivo, 300), ''), motivo),
      humano_desde = case when p_humano then coalesce(humano_desde, now()) else humano_desde end,
      robo_ativo = robo_ativo and not p_sair,
      updated_at = now()
  where id = v.id;

  if p_sair then
    insert into public.nao_contactar (owner_id, business_id, telefone, motivo)
    values (v.owner_id, v.business_id, v.numero, 'pediu para sair (percebido pelo robô)')
    on conflict do nothing;
    update public.whatsapp_envios set estado = 'cancelado', erro = 'pediu para sair'
    where owner_id = v.owner_id and numero = v.numero and estado = 'pendente';
  end if;

  -- Lead quente ou pedido de humano: sobe para o topo de «Leads a contactar».
  if (p_quente and not ja_quente) or (p_humano and not ja_humano) then
    if v.business_id is not null then
      insert into public.deals (owner_id, business_id, next_action, next_action_at)
      values (v.owner_id, v.business_id,
              left('WhatsApp: ' || coalesce(nullif(p_motivo, ''), 'lead quente — responder já'), 300), now())
      on conflict (owner_id, business_id) do update
      set next_action = excluded.next_action, next_action_at = excluded.next_action_at;
    end if;

    avisar := r.avisar_numero is not null;
    avisar_numero := r.avisar_numero;
    instancia := (select ch.instancia from public.whatsapp_chips ch where ch.id = v.chip_id);
    numero := v.numero;
    nome := coalesce(
      (select b.name from public.businesses b where b.id = v.business_id),
      (select m.nome_contacto from public.whatsapp_mensagens m
       where m.owner_id = v.owner_id and m.numero = v.numero and m.nome_contacto is not null
       order by m.enviada_em desc limit 1)
    );
    return next;
  end if;
end;
$$;

revoke all on function public.whatsapp_robo_resultado(uuid, uuid, text, text, text, boolean, boolean, boolean, text, jsonb) from public;
grant execute on function public.whatsapp_robo_resultado(uuid, uuid, text, text, text, boolean, boolean, boolean, text, jsonb) to anon, authenticated;
