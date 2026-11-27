-- «Enviar teste para o meu WhatsApp».
--
-- Uma conversa de teste (`teste = true`) é aberta pelo painel com uma mensagem
-- de abertura para um número escolhido à mão. O robô responde-lhe mesmo que o
-- número nunca tenha recebido um disparo — é a maneira de ver o robô a sério,
-- no WhatsApp, antes de o ligar a clientes. Não entra em nenhum disparo, não
-- conta para o limite do chip e não bloqueia o número para disparos futuros.

alter table public.whatsapp_conversas add column if not exists teste boolean not null default false;

create or replace function public.whatsapp_robo_pode(p_conversa public.whatsapp_conversas)
returns boolean language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.whatsapp_robo r
    where r.owner_id = p_conversa.owner_id
      and r.ativo
      and p_conversa.robo_ativo
      and p_conversa.humano_desde is null
      and p_conversa.respostas_robo < r.max_respostas
      and not exists (select 1 from public.whatsapp_aquecimento_numeros a
                      where a.owner_id = p_conversa.owner_id and a.numero = p_conversa.numero)
      and not exists (select 1 from public.whatsapp_chips o
                      where o.owner_id = p_conversa.owner_id and o.numero = p_conversa.numero)
      and not exists (select 1 from public.nao_contactar n
                      where n.owner_id = p_conversa.owner_id and n.telefone = p_conversa.numero)
      and (
        p_conversa.teste
        or r.responder_a = 'todos'
        or exists (select 1 from public.whatsapp_envios e
                   where e.owner_id = p_conversa.owner_id and e.numero = p_conversa.numero
                     and not e.aquecimento and e.estado = 'enviado')
        or (r.responder_a = 'leads' and p_conversa.business_id is not null)
      )
  );
$$;
revoke all on function public.whatsapp_robo_pode(public.whatsapp_conversas) from public;
revoke execute on function public.whatsapp_robo_pode(public.whatsapp_conversas) from anon, authenticated;
