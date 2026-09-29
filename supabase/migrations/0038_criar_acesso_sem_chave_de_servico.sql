-- Dar acesso a alguém sem sair do painel.
--
-- A primeira versão disto criava a conta pela API de administração do Supabase,
-- que precisa da SUPABASE_SERVICE_ROLE_KEY. Essa chave é a chave-mestra do
-- projecto: quem a tem lê e escreve tudo, RLS incluída. Punha-la no Vercel
-- obrigava a ir a dois sítios e deixava a chave-mestra a viver dentro da
-- aplicação para fazer uma coisa que se faz uma vez por mês.
--
-- Aqui a conta nasce dentro da base, numa função que só o DONO pode chamar e
-- que só sabe fazer uma coisa: criar alguém e pô-lo na equipa de quem a
-- chamou, no mesmo instante. Não há chave nenhuma para guardar, e a função
-- não serve para mais nada — ao contrário da chave de serviço, que serve para
-- tudo.
--
-- O QUE ISTO TEM CONTRA. Escreve em `auth.users`, que é a casa do Supabase e
-- não a nossa; se um dia eles mudarem essa tabela, isto pode partir-se. Parte-se
-- a fazer barulho — a criação falha e vê-se — e não em silêncio. É o preço de
-- não ter a chave-mestra dentro da aplicação, e vale a pena.

create or replace function public.criar_acesso(
  p_nome text,
  p_email text,
  p_senha text,
  p_permissoes text[]
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
  -- Quem chama tem de ser um dono. Um membro que descobrisse o nome desta
  -- função não pode criar contas — nem para a equipa dele, nem para outra.
  if v_dono is null then
    raise exception 'é preciso ter sessão iniciada';
  end if;
  if exists (select 1 from public.membros_da_equipa m where m.user_id = v_dono and m.ativo) then
    raise exception 'só o dono da conta pode dar acesso a alguém';
  end if;

  if coalesce(trim(p_nome), '') = '' then
    raise exception 'falta o nome da pessoa';
  end if;
  if v_email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' then
    raise exception 'o email não parece um email';
  end if;
  if length(p_senha) < 8 then
    raise exception 'a senha tem de ter pelo menos 8 caracteres';
  end if;
  if exists (select 1 from auth.users u where lower(u.email) = v_email) then
    raise exception 'já existe uma conta com esse email';
  end if;

  -- A conta. Fica confirmada à nascença: a senha foi dada em mão por quem
  -- convidou, e mandar um email de confirmação para uma caixa que talvez não
  -- exista deixava a conta criada mas sem poder entrar.
  insert into auth.users (
    id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at,
    confirmation_token, recovery_token, email_change, email_change_token_new
  ) values (
    v_novo,
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    v_email,
    extensions.crypt(p_senha, extensions.gen_salt('bf')),
    now(),
    jsonb_build_object('provider', 'email', 'providers', jsonb_build_array('email')),
    jsonb_build_object('nome', trim(p_nome)),
    now(), now(),
    '', '', '', ''
  );

  -- Sem esta linha a conta existe e não entra: é a identidade que diz ao
  -- Supabase que esta pessoa se autentica por email e senha.
  insert into auth.identities (
    id, user_id, provider, provider_id, identity_data, last_sign_in_at, created_at, updated_at
  ) values (
    gen_random_uuid(),
    v_novo,
    'email',
    v_novo::text,
    jsonb_build_object('sub', v_novo::text, 'email', v_email, 'email_verified', true, 'phone_verified', false),
    null, now(), now()
  );

  -- E entra na equipa de quem a criou. Na mesma transacção: uma conta que
  -- ficasse criada sem equipa era uma entrada que dá para iniciar sessão e não
  -- leva a lado nenhum.
  insert into public.membros_da_equipa (dono_id, user_id, nome, email, permissoes)
  values (v_dono, v_novo, trim(p_nome), v_email, coalesce(p_permissoes, '{}'));

  return v_novo;
end;
$$;

comment on function public.criar_acesso(text, text, text, text[]) is
  'Cria uma conta de entrada e põe-na na equipa de quem chamou. Só o dono pode.';

-- Fechada a toda a gente menos a quem tem sessão. A verificação de ser dono
-- está lá dentro; isto só tira a função da vista de quem nem sessão tem.
revoke all on function public.criar_acesso(text, text, text, text[]) from public, anon;
grant execute on function public.criar_acesso(text, text, text, text[]) to authenticated;

-- Mudar a senha de alguém da equipa, pela mesma porta e com as mesmas regras.
-- Sem isto, uma senha esquecida obrigava a ir ao Supabase — que é exactamente
-- o que esta migração existe para evitar.
create or replace function public.mudar_senha_do_membro(p_membro uuid, p_senha text)
returns void
language plpgsql
security definer
set search_path to ''
as $$
declare
  v_dono uuid := auth.uid();
  v_user uuid;
begin
  if v_dono is null then
    raise exception 'é preciso ter sessão iniciada';
  end if;
  if length(p_senha) < 8 then
    raise exception 'a senha tem de ter pelo menos 8 caracteres';
  end if;

  -- O `dono_id = v_dono` é o que impede mudar a senha de alguém de outra
  -- equipa: sem linha encontrada, não se muda nada.
  select m.user_id into v_user
    from public.membros_da_equipa m
   where m.id = p_membro and m.dono_id = v_dono;

  if v_user is null then
    raise exception 'essa pessoa não é da tua equipa';
  end if;

  update auth.users
     set encrypted_password = extensions.crypt(p_senha, extensions.gen_salt('bf')),
         updated_at = now()
   where id = v_user;
end;
$$;

comment on function public.mudar_senha_do_membro(uuid, text) is
  'Troca a senha de alguém da equipa do dono que chamou.';

revoke all on function public.mudar_senha_do_membro(uuid, text) from public, anon;
grant execute on function public.mudar_senha_do_membro(uuid, text) to authenticated;
