-- Duas portas públicas para o envio de e-mails.
--
-- Quem clica em "não quero receber mais" não tem sessão, e o aviso de que um
-- e-mail foi devolvido vem do Resend, não de uma pessoa. Nenhum dos dois
-- passa pelas políticas de linha (que exigem um utilizador), por isso cada um
-- tem a sua função, com `security definer`, que faz UMA coisa e nada mais.
--
-- Sem chave de serviço na aplicação, de propósito (ver 0038): estas funções
-- são o único sítio onde um visitante anónimo escreve nestas tabelas, e cada
-- uma só aceita um identificador que quem não recebeu o e-mail não conhece.

-- ---------- cancelar a subscrição ----------
--
-- O identificador é o `id` da linha de `emails_enviados`: um uuid aleatório que
-- só existe dentro do e-mail que a pessoa recebeu. Guarda o ENDEREÇO e não só o
-- negócio, para ficar de fora mesmo que a mesma caixa apareça noutro lead.
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

-- ---------- o que o Resend diz que aconteceu ----------
--
-- A assinatura do aviso é verificada na rota (`/api/resend/webhook`) antes de
-- chegar aqui. O `p_resend_id` é a segunda barreira: só quem recebeu a resposta
-- do Resend o conhece.
--
-- Um estado só avança: um «entregue» que chega depois de um «devolvido» (os
-- avisos podem vir fora de ordem) não desfaz o devolvido.
create or replace function public.registar_evento_email(p_resend_id text, p_evento text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  linha public.emails_enviados;
  motivo text;
begin
  select * into linha from public.emails_enviados where resend_id = p_resend_id;
  if not found then
    return false;
  end if;

  if p_evento = 'email.delivered' then
    update public.emails_enviados
       set entregue_em = coalesce(entregue_em, now()),
           estado = case when estado = 'enviado' then 'entregue' else estado end
     where id = linha.id;

  elsif p_evento = 'email.opened' then
    update public.emails_enviados
       set aberto_em = coalesce(aberto_em, now()),
           estado = case when estado in ('enviado', 'entregue') then 'aberto' else estado end
     where id = linha.id;

  elsif p_evento in ('email.bounced', 'email.complained') then
    motivo := case p_evento
      when 'email.bounced' then 'o e-mail voltou para trás (endereço inexistente)'
      else 'marcou como spam'
    end;
    update public.emails_enviados
       set estado = case p_evento when 'email.bounced' then 'devolvido' else 'queixa' end,
           erro = motivo
     where id = linha.id;
    -- Mandar outra vez para um endereço que devolveu, ou para quem se queixou,
    -- é o que estraga um domínio de envio. Fica de fora para sempre.
    insert into public.nao_contactar (owner_id, business_id, email, motivo)
    values (linha.owner_id, linha.business_id, lower(linha.para), motivo)
    on conflict do nothing;
  end if;

  return true;
end;
$$;

revoke all on function public.registar_evento_email(text, text) from public;
grant execute on function public.registar_evento_email(text, text) to anon, authenticated;

-- ---------- o texto da campanha, e se foi aprovado ----------
--
-- Uma linha por campanha. `aprovada_em` é o que dá licença para enviar, e
-- quem escreve o texto não a pode dar a si próprio: qualquer alteração ao
-- assunto ou ao corpo apaga-a (feito na aplicação, em `guardarCampanha`).
create table if not exists public.campanhas_email (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default public.current_owner_id(),
  nome text not null,
  assunto text not null,
  corpo text not null,
  aprovada_em timestamptz,
  limite_diario integer not null default 25 check (limite_diario between 1 and 100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.campanhas_email enable row level security;

drop policy if exists "campanhas_email: o dono manda" on public.campanhas_email;
create policy "campanhas_email: o dono manda" on public.campanhas_email for all to authenticated
  using (owner_id = (select public.current_owner_id()))
  with check (owner_id = (select public.current_owner_id()));

-- Quem entra com uma conta de equipa escreve em nome do dono, não em nome de si
-- próprio. O `auth.uid()` que estas duas tinham por omissão daria `owner_id` do
-- membro, e a política recusaria a linha.
alter table public.nao_contactar alter column owner_id set default public.current_owner_id();
alter table public.emails_enviados alter column owner_id set default public.current_owner_id();
