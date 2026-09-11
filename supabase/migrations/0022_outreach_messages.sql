-- ---------------------------------------------------------------------------
-- 0022 — mensagens de abordagem escritas por IA
--
-- A primeira frase é onde a maior parte das prospeções morre. Tem-se a lista,
-- tem-se a página, tem-se o PDF — e depois fica-se a olhar para o número sem
-- saber como começar. Isto guarda as mensagens que a IA escreve para cada
-- comércio.
--
-- Guardar é obrigatório e não opcional, pela mesma razão que o cache das
-- consultas à Google: cada geração é uma chamada paga. Abrir a ficha do
-- comércio outra vez tem de mostrar o que já se escreveu, não voltar a
-- comprá-lo.
--
-- `variants` é uma lista de textos e não uma coluna por mensagem. Três
-- abordagens diferentes para a mesma pessoa escolher é o que serve — e o
-- número há de mudar, o que numa coluna por variante obrigava a uma migração
-- de cada vez que mudasse.
--
-- `kind` existe para o dia em que houver mais do que o primeiro contacto:
-- insistir depois de silêncio, agradecer depois de uma reunião, reabrir um
-- perdido. Cada um é uma linha, e a chave única é (comércio, tipo) — gerar de
-- novo o mesmo tipo substitui, não acumula lixo.
-- ---------------------------------------------------------------------------

create table public.outreach_messages (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid()
    references auth.users (id) on delete cascade,
  business_id uuid not null
    references public.businesses (id) on delete cascade,

  kind text not null default 'first_contact'
    check (kind ~ '^[a-z_]{3,40}$'),

  -- ["Olá, …", "Bom dia, …", "…"]
  variants jsonb not null default '[]'::jsonb
    check (jsonb_typeof(variants) = 'array'),

  -- O que gerou isto, para se saber o que reler quando uma mensagem sair má.
  model text,
  input_tokens integer check (input_tokens is null or input_tokens >= 0),
  output_tokens integer check (output_tokens is null or output_tokens >= 0),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint outreach_messages_one_per_kind unique (business_id, kind)
);

comment on table public.outreach_messages is
  'Mensagens de primeiro contacto escritas por IA, guardadas por comércio. Cada geração é uma chamada paga: lê-se daqui antes de se voltar a gerar.';
comment on column public.outreach_messages.variants is
  'Lista de textos alternativos para a mesma abordagem. Quem contacta escolhe um.';

create index outreach_messages_owner_business_idx
  on public.outreach_messages (owner_id, business_id);

create trigger outreach_messages_set_updated_at
  before update on public.outreach_messages
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- RLS: só o dono, como em todas as outras. Não há leitura pública nenhuma —
-- ao contrário da landing page, isto nunca é mostrado a ninguém de fora.
-- ---------------------------------------------------------------------------
alter table public.outreach_messages enable row level security;

create policy "outreach: owner reads" on public.outreach_messages
  for select to authenticated using (owner_id = (select public.current_owner_id()));
create policy "outreach: owner inserts" on public.outreach_messages
  for insert to authenticated with check (owner_id = (select public.current_owner_id()));
create policy "outreach: owner updates" on public.outreach_messages
  for update to authenticated
  using (owner_id = (select public.current_owner_id()))
  with check (owner_id = (select public.current_owner_id()));
create policy "outreach: owner deletes" on public.outreach_messages
  for delete to authenticated using (owner_id = (select public.current_owner_id()));
