-- Equipa e permissões: mais do que uma pessoa a usar o mesmo painel.
--
-- Até aqui cada conta era uma ilha: `current_owner_id()` devolvia `auth.uid()`
-- e ponto final, por isso uma segunda pessoa que entrasse via um painel vazio,
-- não o da agência. Esta migração abre a porta a convidados sem mexer nas
-- dezenas de políticas que já existem, e é por isso que a função estava lá:
-- quase todas as tabelas já perguntam "de quem é este espaço?" em vez de
-- "quem está a ver?". Muda-se a resposta num sítio só.
--
-- O DONO NÃO TEM LINHA NENHUMA nesta tabela. Quem não é membro de ninguém é
-- dono do seu próprio espaço, e isso sai de graça do `coalesce` lá em baixo.
-- A alternativa — uma linha "dono" que alguém podia apagar por engano — dava
-- uma conta sem dono e sem maneira de lá voltar a entrar.

create table if not exists public.membros_da_equipa (
  id uuid primary key default gen_random_uuid(),

  -- De quem é o espaço a que esta pessoa passa a ter acesso.
  dono_id uuid not null references auth.users (id) on delete cascade,

  -- Quem entra. Único: uma pessoa pertence a uma equipa e não a duas, senão
  -- `current_owner_id()` tinha de escolher uma e escolher em silêncio.
  user_id uuid not null unique references auth.users (id) on delete cascade,

  nome text not null,
  email text not null,

  -- As áreas do painel a que chega. Texto e não uma tabela à parte: são uma
  -- dúzia de chaves que mudam quando o menu muda, e uma tabela de referência
  -- só acrescentava uma migração por cada área nova.
  permissoes text[] not null default '{}',

  ativo boolean not null default true,
  created_at timestamptz not null default now(),

  -- Um dono não se convida a si próprio. Sem isto, `current_owner_id()`
  -- continuava a devolver o mesmo valor, mas a linha ficava lá a confundir
  -- quem fosse ler a tabela.
  constraint membro_nao_e_o_dono check (user_id <> dono_id)
);

create index if not exists membros_da_equipa_dono_idx on public.membros_da_equipa (dono_id);

alter table public.membros_da_equipa enable row level security;

-- As duas políticas falam de `auth.uid()` DIRECTAMENTE e nunca de
-- `current_owner_id()`. Não é distração: a função lê esta tabela, e uma
-- política que a chamasse punha o Postgres a chamar a política para responder
-- à política. Recursão infinita, e o painel inteiro deixava de abrir.
drop policy if exists "equipa: o dono manda no seu espaço" on public.membros_da_equipa;
create policy "equipa: o dono manda no seu espaço"
  on public.membros_da_equipa for all to authenticated
  using (dono_id = (select auth.uid()))
  with check (dono_id = (select auth.uid()));

drop policy if exists "equipa: cada um lê a sua própria linha" on public.membros_da_equipa;
create policy "equipa: cada um lê a sua própria linha"
  on public.membros_da_equipa for select to authenticated
  using (user_id = (select auth.uid()));

-- A mudança que faz tudo isto funcionar.
--
-- SECURITY DEFINER porque tem de ler `membros_da_equipa` sem passar pela RLS
-- dessa tabela — se passasse, voltávamos à recursão descrita acima.
create or replace function public.current_owner_id()
returns uuid
language sql
stable
security definer
set search_path to ''
as $$
  select coalesce(
    (select m.dono_id
       from public.membros_da_equipa m
      where m.user_id = auth.uid() and m.ativo),
    auth.uid()
  );
$$;

comment on function public.current_owner_id() is
  'De quem é o espaço que o utilizador actual está a ver. O seu próprio, ou o de quem o convidou.';

-- Quem está a ver, e o que pode.
--
-- Uma chamada só em vez de três: o painel precisa disto em TODAS as páginas,
-- e três idas à base por página é o tipo de coisa que não se nota até o painel
-- ficar lento e ninguém saber porquê.
create or replace function public.quem_sou()
returns table (
  user_id uuid,
  dono_id uuid,
  eh_dono boolean,
  nome text,
  permissoes text[]
)
language sql
stable
security definer
set search_path to ''
as $$
  select
    auth.uid(),
    public.current_owner_id(),
    public.current_owner_id() = auth.uid(),
    coalesce(m.nome, ''),
    -- O dono não tem linha, e por isso não tem lista de permissões: tem tudo.
    -- O `*` diz isso numa palavra, e poupa a quem lê o código ter de se
    -- lembrar de juntar o dono a cada verificação.
    case when m.id is null then array['*'] else m.permissoes end
  from (select 1) as _
  left join public.membros_da_equipa m
    on m.user_id = auth.uid() and m.ativo;
$$;

comment on function public.quem_sou() is
  'Quem está a ver o painel, de quem é o espaço, e a que áreas chega.';

grant execute on function public.current_owner_id() to authenticated, anon;
grant execute on function public.quem_sou() to authenticated;
