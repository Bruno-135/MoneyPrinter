-- O robô responde mais depressa.
--
-- Antes: espera de 25 s para juntar mensagens seguidas + até 60 s até o
-- pg_cron passar. Respostas entre 30 s e quase 2 minutos — no primeiro teste
-- real pareceu lento demais. Agora: espera de 8 s, e o webhook acorda o motor
-- logo a seguir (`whatsapp_acordar`, guardada pelo token do chip) em vez de
-- esperar pelo minuto seguinte. O pg_cron continua a passar a cada minuto
-- como rede de segurança.

create or replace function public.whatsapp_receber(p_token uuid, p_evento jsonb)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  c public.whatsapp_chips;
  conv public.whatsapp_conversas;
  ev text;
  d jsonb;
  jid text;
  v_numero text;
  v_de_mim boolean;
  v_texto text;
  v_quando timestamptz;
  v_negocio uuid;
  palavra text;
begin
  select * into c from public.whatsapp_chips where webhook_token = p_token;
  if not found then
    return 'desconhecido';
  end if;

  ev := lower(replace(coalesce(p_evento ->> 'event', ''), '_', '.'));
  d := p_evento -> 'data';

  if ev = 'connection.update' then
    update public.whatsapp_chips
    set estado = case d ->> 'state' when 'open' then 'ligado' when 'connecting' then 'a_ligar' else 'desligado' end,
        updated_at = now()
    where id = c.id;
    return 'ligacao';
  end if;

  if ev <> 'messages.upsert' or d is null or jsonb_typeof(d) <> 'object' then
    return 'ignorado';
  end if;

  jid := d -> 'key' ->> 'remoteJid';
  if jid like '%@lid' then
    jid := coalesce(d -> 'key' ->> 'remoteJidAlt', d -> 'key' ->> 'senderPn', jid);
  end if;
  if jid is null or jid not like '%@s.whatsapp.net' then
    return 'ignorado';
  end if;

  v_numero := regexp_replace(split_part(split_part(jid, '@', 1), ':', 1), '\D', '', 'g');
  if v_numero !~ '^[1-9][0-9]{7,14}$' then
    return 'ignorado';
  end if;

  v_de_mim := coalesce((d -> 'key' ->> 'fromMe')::boolean, false);
  v_texto := coalesce(
    d -> 'message' ->> 'conversation',
    d -> 'message' -> 'extendedTextMessage' ->> 'text',
    d -> 'message' -> 'imageMessage' ->> 'caption',
    d -> 'message' -> 'videoMessage' ->> 'caption'
  );
  v_quando := case
    when (d ->> 'messageTimestamp') ~ '^\d+$' then to_timestamp((d ->> 'messageTimestamp')::bigint)
    else now()
  end;

  select e.business_id into v_negocio from public.whatsapp_envios e
  where e.owner_id = c.owner_id and e.numero = v_numero and e.business_id is not null
  order by e.created_at desc limit 1;
  if v_negocio is null then
    select b.id into v_negocio from public.businesses b
    where b.owner_id = c.owner_id and b.phone_e164 = '+' || v_numero
    limit 1;
  end if;

  insert into public.whatsapp_mensagens
    (owner_id, chip_id, numero, business_id, de_mim, texto, tipo, nome_contacto, mensagem_id, enviada_em, lida)
  values (
    c.owner_id, c.id, v_numero, v_negocio, v_de_mim, left(v_texto, 4000),
    coalesce(d ->> 'messageType', 'texto'),
    case when v_de_mim then null else left(d ->> 'pushName', 120) end,
    left(d -> 'key' ->> 'id', 200), v_quando, v_de_mim
  )
  on conflict do nothing;

  if v_de_mim then
    return 'minha';
  end if;

  update public.whatsapp_envios
  set respondeu_em = coalesce(respondeu_em, v_quando)
  where owner_id = c.owner_id and numero = v_numero and estado = 'enviado';

  insert into public.whatsapp_conversas (owner_id, numero, chip_id, business_id, ultima_entrada_em)
  values (c.owner_id, v_numero, c.id, v_negocio, v_quando)
  on conflict (owner_id, numero) do update
  set chip_id = excluded.chip_id,
      business_id = coalesce(public.whatsapp_conversas.business_id, excluded.business_id),
      ultima_entrada_em = excluded.ultima_entrada_em,
      seguimento_em = null,
      updated_at = now()
  returning * into conv;

  palavra := upper(regexp_replace(coalesce(v_texto, ''), '[^[:alpha:]]', '', 'g'));
  if palavra in ('SAIR', 'PARAR', 'STOP', 'CANCELAR', 'REMOVER', 'DESCADASTRAR') then
    insert into public.nao_contactar (owner_id, business_id, telefone, motivo)
    values (c.owner_id, v_negocio, v_numero, 'respondeu ' || palavra || ' no WhatsApp')
    on conflict do nothing;

    update public.whatsapp_envios set estado = 'cancelado', erro = 'pediu para sair'
    where owner_id = c.owner_id and numero = v_numero and estado = 'pendente';

    update public.whatsapp_conversas set robo_ativo = false, responder_em = null, seguimento_em = null
    where id = conv.id;
    return 'saiu';
  end if;

  if public.whatsapp_robo_pode(conv) then
    update public.whatsapp_conversas set responder_em = now() + interval '8 seconds'
    where id = conv.id;
    return 'robo';
  end if;

  return 'mensagem';
end;
$$;


create or replace function public.whatsapp_acordar(p_token uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if exists (select 1 from public.whatsapp_chips where webhook_token = p_token) then
    perform public.whatsapp_chamar_motor();
  end if;
end;
$$;
revoke all on function public.whatsapp_acordar(uuid) from public;
grant execute on function public.whatsapp_acordar(uuid) to anon, authenticated;
