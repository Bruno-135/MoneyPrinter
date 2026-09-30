-- O papel de cada pessoa: comercial, operacional, suporte.
--
-- Duas coisas ao mesmo tempo, e é de propósito que são as duas:
--
-- 1. UMA ETIQUETA. Numa lista de cinco pessoas, ler sete nomes de áreas para
--    perceber o que cada uma faz é trabalho a mais. «Comercial» diz-se num
--    relance.
--
-- 2. UM ATALHO. Ao criar alguém, escolher o papel marca as caixas que costumam
--    ir com ele. As caixas continuam todas lá para mexer — o papel propõe, não
--    impõe. Quem manda nos acessos é a lista de permissões e nunca este campo:
--    guardar aqui a verdade sobre o que alguém pode fazer dava duas respostas
--    para a mesma pergunta, e mais tarde ou mais cedo discordavam.
--
-- Por isso `papel` é texto livre com um valor por omissão e não um enum: um
-- papel novo é uma linha no ficheiro das permissões, não uma migração.

alter table public.membros_da_equipa
  add column if not exists papel text not null default 'personalizado';

comment on column public.membros_da_equipa.papel is
  'Etiqueta legível (comercial, operacional, suporte, personalizado). Não decide acessos — quem decide é permissoes.';

-- A função de criar passa a receber o papel. Mantém-se o nome e a ordem dos
-- outros argumentos; o papel vai no fim com valor por omissão, para o código
-- que ainda não o mande continuar a funcionar.
create or replace function public.criar_acesso(
  p_nome text,
  p_email text,
  p_senha text,
  p_permissoes text[],
  p_papel text default 'personalizado'
)
returns uuid
language plpgsql
security definer
set search_path to ''
as $$
declare
  v_dono uuid := auth.uid();
  v_email text := lower(trim(p_email));
  v_novo uuid := gen_random_uuid();
begin
  if v_dono is null then raise exception 'é preciso ter sessão iniciada'; end if;
  if exists (select 1 from public.membros_da_equipa m where m.user_id = v_dono and m.ativo) then
    raise exception 'só o dono da conta pode dar acesso a alguém';
  end if;
  if coalesce(trim(p_nome), '') = '' then raise exception 'falta o nome da pessoa'; end if;
  if v_email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' then
    raise exception 'o email não parece um email';
  end if;
  if length(p_senha) < 8 then raise exception 'a senha tem de ter pelo menos 8 caracteres'; end if;
  if exists (select 1 from auth.users u where lower(u.email) = v_email) then
    raise exception 'já existe uma conta com esse email';
  end if;

  insert into auth.users (
    id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, recovery_token, email_change, email_change_token_new
  ) values (
    v_novo, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', v_email,
    extensions.crypt(p_senha, extensions.gen_salt('bf')), now(),
    jsonb_build_object('provider', 'email', 'providers', jsonb_build_array('email')),
    jsonb_build_object('nome', trim(p_nome)), now(), now(), '', '', '', ''
  );

  insert into auth.identities (
    id, user_id, provider, provider_id, identity_data, last_sign_in_at, created_at, updated_at
  ) values (
    gen_random_uuid(), v_novo, 'email', v_novo::text,
    jsonb_build_object('sub', v_novo::text, 'email', v_email, 'email_verified', true, 'phone_verified', false),
    null, now(), now()
  );

  insert into public.membros_da_equipa (dono_id, user_id, nome, email, permissoes, papel)
  values (v_dono, v_novo, trim(p_nome), v_email, coalesce(p_permissoes, '{}'),
          coalesce(nullif(trim(p_papel), ''), 'personalizado'));

  return v_novo;
end;
$$;

comment on function public.criar_acesso(text, text, text, text[], text) is
  'Cria uma conta de entrada e põe-na na equipa de quem chamou. Só o dono pode.';

revoke all on function public.criar_acesso(text, text, text, text[], text) from public, anon;
grant execute on function public.criar_acesso(text, text, text, text[], text) to authenticated;

-- A versão de quatro argumentos deixa de existir, para não ficarem duas
-- funções com o mesmo nome e o Postgres ter de adivinhar qual é qual.
drop function if exists public.criar_acesso(text, text, text, text[]);
