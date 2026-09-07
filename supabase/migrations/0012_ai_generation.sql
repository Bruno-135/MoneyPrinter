-- ============================================================================
-- 0012 — Geração de páginas por IA
--
-- Dois modos, uma tabela:
--
--   preencher campos — o modelo escreve para `content` e `theme`, as colunas
--                      que já existiam. Nada de novo é preciso: continua a ser
--                      uma página normal, editável campo a campo.
--   HTML livre       — o modelo escreve a página inteira, e ela vai para
--                      `custom_html`. É a presença desta coluna preenchida que
--                      diz ao render qual dos dois caminhos seguir; não há
--                      necessidade de um enum a duplicar a mesma informação.
-- ============================================================================

alter table public.generated_sites
  -- HTML já limpo (ver src/lib/ai/sanitize.ts). Nunca se guarda em cru: isto
  -- é servido num endereço público, à frente dos clientes do comerciante.
  add column if not exists custom_html text,

  -- Que modelo fez esta página. Sem isto, daqui a três meses não há como saber
  -- se os sites que fecharam negócio foram os caros ou os baratos — que é
  -- precisamente a pergunta que decide se vale a pena continuar a pagar o Opus.
  add column if not exists ai_model text,

  -- O pedido escrito por quem gerou. Guarda-se por duas razões: para se poder
  -- repetir a geração com um ajuste em vez de a reescrever do zero, e para se
  -- perceber, ao ver uma página estranha, o que é que lhe foi pedido.
  add column if not exists ai_brief text,

  add column if not exists ai_generated_at timestamptz,

  -- Tokens da última geração. É o que permite comparar o custo estimado no
  -- ecrã com o que a chamada gastou de facto.
  add column if not exists ai_input_tokens integer check (ai_input_tokens >= 0),
  add column if not exists ai_output_tokens integer check (ai_output_tokens >= 0);

comment on column public.generated_sites.custom_html is
  'Página inteira em HTML, gerada por IA e já limpa. Quando preenchida, é ela que se mostra em vez de content.';
comment on column public.generated_sites.ai_model is
  'Identificador do modelo que gerou esta página, ex.: claude-opus-5.';
comment on column public.generated_sites.ai_brief is
  'O pedido em texto livre que originou esta versão.';

-- Uma página gerada por IA tem de dizer por que modelo, e quando. Sem esta
-- regra, uma escrita a meio deixava linhas com HTML de origem desconhecida.
alter table public.generated_sites
  drop constraint if exists generated_sites_ai_fields_together;

alter table public.generated_sites
  add constraint generated_sites_ai_fields_together
  check (
    (ai_model is null and ai_generated_at is null)
    or (ai_model is not null and ai_generated_at is not null)
  );
