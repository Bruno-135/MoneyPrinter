-- Um teste novo é uma conversa nova para o robô.
--
-- No primeiro teste real, o robô via no histórico as mensagens de abertura
-- repetidas dos testes anteriores (cada clique impaciente mandou mais uma),
-- pedia desculpa por elas e passava a conversa ao Bruno. `contexto_desde`
-- diz a partir de quando as mensagens contam para o robô; o «Enviar teste»
-- põe-no no momento do envio. Nas conversas normais fica nulo: conta tudo.

alter table public.whatsapp_conversas add column if not exists contexto_desde timestamptz;

create or replace function public.whatsapp_reclamar_robo(p_token uuid)
returns table (conversa_id uuid, numero text, instancia text, pais text, tipo text, contexto jsonb)
language plpgsql
security definer
set search_path = public
as $$
#variable_conflict use_column
declare
  v public.whatsapp_conversas;
  r public.whatsapp_robo;
  ch public.whatsapp_chips;
  v_pais text;
  v_tipo text;
  feitos integer := 0;
begin
  if not exists (select 1 from public.whatsapp_sistema where token_do_motor = p_token) then
    return;
  end if;

  for v in
    select * from public.whatsapp_conversas w
    where w.a_responder_desde is null
      and (w.responder_em <= now() or (w.seguimento_em <= now() and not w.seguimento_feito))
    order by coalesce(w.responder_em, w.seguimento_em)
    for update skip locked
  loop
    exit when feitos >= 5;
    v_tipo := case when v.responder_em is not null and v.responder_em <= now() then 'resposta' else 'seguimento' end;
    v_pais := case when v.numero like '55%' then 'BR' else 'PT' end;

    if public.whatsapp_humano_escreveu(v) then
      update public.whatsapp_conversas
      set humano_desde = now(), responder_em = null, seguimento_em = null, updated_at = now()
      where id = v.id;
      continue;
    end if;

    if not public.whatsapp_robo_pode(v) then
      update public.whatsapp_conversas set responder_em = null, seguimento_em = null where id = v.id;
      continue;
    end if;

    select * into r from public.whatsapp_robo where owner_id = v.owner_id;
    if public.whatsapp_hora_local(v_pais) < r.hora_inicio or public.whatsapp_hora_local(v_pais) >= r.hora_fim then
      continue;
    end if;

    if v_tipo = 'seguimento' and coalesce(v.ultima_entrada_em, '-infinity') > coalesce(v.ultima_saida_em, '-infinity') then
      update public.whatsapp_conversas set seguimento_em = null where id = v.id;
      continue;
    end if;

    select * into ch from public.whatsapp_chips
    where id = v.chip_id and estado = 'ligado' and ativo and travado_motivo is null;
    if not found then
      continue;
    end if;

    update public.whatsapp_conversas
    set a_responder_desde = now(), responder_em = null, updated_at = now()
    where id = v.id;

    conversa_id := v.id;
    numero := v.numero;
    instancia := ch.instancia;
    pais := v_pais;
    tipo := v_tipo;
    contexto := jsonb_build_object(
      'robo', jsonb_build_object(
        'modelo', r.modelo, 'sobre', r.sobre, 'objetivo', r.objetivo, 'regras', r.regras,
        'max_respostas', r.max_respostas
      ),
      'respostas_robo', v.respostas_robo,
      'lead', (
        select jsonb_build_object(
          'nome', b.name, 'ramo', b.business_category, 'cidade', b.locality,
          'pais', b.country_code, 'site', b.website_kind
        )
        from public.businesses b where b.id = v.business_id
      ),
      'nome_whatsapp', (
        select m.nome_contacto from public.whatsapp_mensagens m
        where m.owner_id = v.owner_id and m.numero = v.numero and m.nome_contacto is not null
        order by m.enviada_em desc limit 1
      ),
      'mensagens', coalesce((
        select jsonb_agg(jsonb_build_object('de_mim', x.de_mim, 'texto', x.texto, 'tipo', x.tipo) order by x.enviada_em)
        from (
          select m.de_mim, m.texto, m.tipo, m.enviada_em from public.whatsapp_mensagens m
          where m.owner_id = v.owner_id and m.numero = v.numero
            and m.created_at >= coalesce(v.contexto_desde, '-infinity'::timestamptz)
          order by m.enviada_em desc limit 30
        ) x
      ), '[]'::jsonb)
    );
    feitos := feitos + 1;
    return next;
  end loop;
end;
$$;
revoke all on function public.whatsapp_reclamar_robo(uuid) from public;
grant execute on function public.whatsapp_reclamar_robo(uuid) to anon, authenticated;
