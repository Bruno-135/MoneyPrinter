# PROJETO.md — Sistema de Prospeção Comercial

> **Ler este ficheiro no início de cada etapa, antes de escrever qualquer código.**
> É a fonte de verdade sobre o que o produto faz, como está construído e como se trabalha nele.
> Quando uma decisão aqui deixar de ser verdade, **atualiza este ficheiro na mesma etapa** em que a mudança acontece.

---

## 1. O que o sistema faz

Ferramenta de prospeção comercial para vender sites a pequenos comércios.

Fluxo completo, do início ao fim:

1. **Escolher zona + ramo** — o utilizador escolhe uma região (cidade, bairro, raio) e um ramo de negócio.
2. **Buscar no Google Places** — o sistema procura os comércios dessa zona e desse ramo.
3. **Identificar quem não tem site** — marca os comércios sem website e sem presença digital.
4. **Calcular o score (0–100)** — nota que indica a probabilidade de fechar a venda.
5. **Listar por ordem** — lista ordenada do score mais alto para o mais baixo.
6. **Abrir um comércio** — a partir da ficha do comércio:
   - **gerar uma landing page** já preenchida com os dados dele;
   - **exportar um PDF de apresentação** para levar à reunião;
   - **acompanhar o estado da negociação** (com histórico de mudanças de estado).
7. **Modelo especial para restaurantes e padarias** — landing page com **cardápio** e **pedido via WhatsApp**.
8. **Relatórios mensais** — visitas e cliques nas landing pages geradas.

### Regras de negócio que não se negoceiam

- **Nunca repetir uma consulta ao Google Places.** Toda a resposta da API é guardada em bruto
  (`google_raw`) e cada região pesquisada regista a data da busca. Antes de chamar a API,
  verifica-se sempre a cache de região. API paga não se gasta duas vezes pelo mesmo resultado.
- **Telefone e país em campos separados.** Portugal e Brasil têm formatos diferentes.
  Guarda-se `phone_raw` (como veio), `phone_e164` (normalizado) e `country_code` (ISO-3166-1 alpha-2).
  Nunca se assume o país a partir do formato do número.
- **Toda a tabela principal tem coluna de dono (`owner_id`).** Hoje só existe um utilizador,
  mas o produto pode virar SaaS multiutilizador. Nenhuma tabela de domínio nasce sem dono,
  e nenhuma query de domínio corre sem filtrar por dono (via RLS).
- **Código público das landing pages é aleatório e não sequencial**, com data de expiração.

---

## 2. Decisões técnicas

| Área | Decisão | Porquê |
|------|---------|--------|
| Framework | **Next.js 16 (App Router)** | Server Components + Route Handlers; deploy nativo na Vercel |
| Linguagem | **TypeScript** em modo `strict` | Erros apanhados em build, não em produção |
| Estilos | **Tailwind CSS v4** (`@tailwindcss/postcss`) | Sem ficheiro de config JS; tema em CSS |
| Base de dados | **Supabase (Postgres)** | Postgres puro + Auth + RLS + Storage num só sítio |
| Auth | **Supabase Auth** via `@supabase/ssr` (cookies) | Sessão partilhada entre Server Components, Route Handlers e proxy |
| Isolamento de dados | **RLS ligado em todas as tabelas**, política por `owner_id` | Multiutilizador fica pronto sem reescrever queries |
| Migrações | **SQL versionado** em `supabase/migrations/` | Histórico revisível; sem alterações feitas à mão no painel |
| Hospedagem | **Vercel** | Pedido do utilizador |
| Dados externos | **Google Places API** | Fonte dos comércios |

### Convenções de código

- **Ficheiros e pastas**: `kebab-case`. **Componentes React**: `PascalCase`. **Funções/variáveis**: `camelCase`.
- **SQL**: `snake_case`, tabelas no plural, chaves estrangeiras `<tabela_singular>_id`.
- **Datas em SQL**: sempre `timestamptz`, nunca `timestamp`.
- **Dinheiro**: inteiro em cêntimos (`price_cents`) + `currency` (ISO-4217). Nunca `float`.
- **Código em inglês** (identificadores, tabelas, colunas). **Documentação e UI em português.**
- Tipos da base de dados vivem em `src/types/database.types.ts` e são **atualizados a cada migração**.
- Respostas de API: `{ "data": ... }` em sucesso, `{ "error": { "message": ... } }` em erro, com o código HTTP correto.

### Obrigatório vs opcional nas variáveis

Só `GOOGLE_PLACES_API_KEY` e as três `NEXT_PUBLIC_*` são obrigatórias. As outras
(`PROSPECTOR_*`, `SCAN_API_SECRET`, `SUPABASE_SERVICE_ROLE_KEY`) são opcionais no
arranque e validadas no ponto onde são usadas, com uma mensagem que diz o que
falta e para quê. Cada variável obrigatória a mais é mais uma forma de o
arranque falhar num sítio que não explica porquê.

### Quem procura, e com que identidade

- **No painel**, quem procura é o utilizador com sessão iniciada. As Server
  Actions correm no servidor com essa sessão, portanto a RLS aplica-se e o
  `owner_id` vem do `default auth.uid()`. Não é preciso segredo nenhum.
- **Na linha de comandos e na rota `/api/scan`**, não há sessão de browser, e é
  aí que entram `PROSPECTOR_EMAIL`/`PROSPECTOR_PASSWORD` e o `SCAN_API_SECRET`.

### Chaves e segredos

- `NEXT_PUBLIC_*` → vai para o browser. Só a URL do Supabase e a chave publishable.
- Tudo o resto (service role, Google Places) é **exclusivamente de servidor**.
  **A service role key nunca é importada num Client Component nem prefixada com `NEXT_PUBLIC_`.**
- As variáveis são validadas no arranque em `src/lib/env.ts`. Falta uma → o processo falha logo,
  em vez de rebentar a meio de um pedido.

---

## 3. Estrutura do projeto

```
src/
  app/                     # App Router (rotas, layouts, route handlers)
    entrar/                # ecrã de entrada (Supabase Auth, sem registo aberto)
    s/[code]/              # landing page pública (sem sessão, lida pela RLS)
    painel/                # painel: varrimento, lista ordenada, funil
      comercio/[id]/       # ficha do comércio: contacto, negociação, histórico, score
        apresentacao/      # proposta A4 para guardar em PDF pelo navegador
      site/[id]/cardapio/  # edição do cardápio de uma landing page
      relatorios/          # visitas e cliques por mês
    api/scan/route.ts      # POST /api/scan — varrimento sem interface, por token
  lib/
    env.ts                 # validação das variáveis de ambiente
    sites/                 # landing pages (etapa 4)
      content.ts           # dados do comércio -> conteúdo da página
      repository.ts        # gerar, publicar, expirar; cardápio; preços
    deals/                 # funil de negociação (etapa 6)
      stages.ts            # os 8 estados, em português e por ordem de funil
      repository.ts        # ler e escrever negociações; o histórico é do trigger
    scoring/               # score de venda e lista ordenada (etapa 3)
      score.ts             # 0-100 em 5 fatores, com explicação por fator
      rank.ts              # lista ordenada, com filtros
    places/                # integração com o Google Places (etapa 2)
      categories.ts        # ramo em português -> tipos do Places
      grid.ts              # grelha hexagonal que cobre a região
      links.ts             # Google Maps e WhatsApp, montados sem chamar a API
      client.ts            # cliente HTTP da Places API (New)
      website.ts           # classificação none / social_only / real
      phone.ts             # normalização de telefones PT e BR
      normalize.ts         # resposta do Places -> linha de `businesses`
      scan.ts              # orquestrador: grelha, cache, gravação, resumo
    supabase/
      client.ts            # cliente browser  (chave publishable)
      server.ts            # cliente servidor (cookies, chave publishable, respeita RLS)
      admin.ts             # cliente service role — só servidor, ignora RLS
      prospector.ts        # cliente autenticado como utilizador (usa a RLS)
  types/
    database.types.ts      # tipos gerados a partir do schema
  app/api/health/route.ts  # verificação da ligação ao Supabase
  proxy.ts                 # refresh da sessão Supabase (o antigo middleware.ts)
scripts/
  load-env.ts              # carrega o .env.local antes de tudo o resto
  scan.ts                  # npm run scan — varrimento pela linha de comandos
  list.ts                  # npm run list — lista ordenada por probabilidade
supabase/
  migrations/              # migrações SQL numeradas
  tests/                   # stubs do Supabase + teste de fumo do schema
  README.md                # o schema explicado tabela a tabela
```

No Next.js 16 o ficheiro `middleware.ts` passou a chamar-se `proxy.ts` e a função
exportada passou de `middleware` para `proxy`. É o mesmo mecanismo, outro nome.

### Qual cliente Supabase usar

| Contexto | Cliente | Notas |
|----------|---------|-------|
| Client Component | `createBrowserClient()` de `lib/supabase/client` | Chave publishable, RLS ativa |
| Server Component / Route Handler / Server Action | `createServerClient()` de `lib/supabase/server` | Lê a sessão dos cookies, RLS ativa |
| Jobs, webhooks, tarefas de sistema | `createAdminClient()` de `lib/supabase/admin` | **Ignora RLS.** Filtrar `owner_id` à mão, sempre |

---

## 4. Base de dados

Dez tabelas de trabalho, todas com `owner_id`, `created_at`, `updated_at` e RLS
ativa. (Há mais tabelas de cache — fotografias do Google e do Pexels — descritas
em `supabase/README.md`.)

| Tabela | Guarda |
|--------|--------|
| `searched_regions` | Regiões já pesquisadas + data da busca (cache anti-desperdício de API) |
| `region_searches` | Cada chamada individual ao Google Places, com resposta em bruto e custo |
| `businesses` | Comércios: `google_place_id`, nome, ramo, morada, telefone, país, nota, nº de avaliações, tem site, tem rede social, score |
| `generated_sites` | Landing pages: conteúdo JSON, código público aleatório, data de expiração |
| `menu_items` | Itens de cardápio ligados a um site (restaurantes/padarias) |
| `deals` | Estado atual da negociação de cada comércio |
| `deal_stage_events` | Histórico de mudanças de estado (escrito por trigger, não à mão) |
| `site_visits` | Visitas às landing pages |
| `site_clicks` | Cliques (WhatsApp, telefone, etc.) |
| `outreach_messages` | Mensagens escritas por IA, uma linha por (comércio, tipo): primeiro contacto e insistência |
| `client_services` | O que cada cliente já comprou: serviço, valor, mensal ou único, data da venda e do cancelamento |
| `contact_events` | Uma linha por contacto feito, com o desfecho e a hora. O histórico de esforço |
| `support_requests` | Pedidos dos clientes que já pagam: o que pediram, a que serviço diz respeito, o prazo e quando ficou feito |
| `client_payments` | O estado de pagamento de cada mês, por cliente: valor congelado, moeda e se está pago |

Vista `monthly_site_report` agrega visitas e cliques por site e por mês
(`security_invoker = on`, portanto respeita a RLS).

Função `facet_counts(campo, filtros…)` conta quantos comércios há de cada
valor de uma coluna, para as caixas de filtro. Contar na aplicação não servia:
o PostgREST corta as respostas às mil linhas por omissão, portanto acima disso
os números mentiam — e um ramo cujos comércios caíssem todos depois da milésima
linha nem aparecia no funil.

Vista `businesses_with_stage` é a que o painel lê: comércios com o estado da
negociação como coluna (sem linha em `deals`, o estado é `new`) e com `has_site`
e `has_live_site` — se já se gerou uma landing page para aquele comércio e se
ela está mesmo no ar. São colunas da vista e não contas feitas na aplicação
porque é o que permite filtrar e contar por elas.

Detalhe tabela a tabela, com o porquê de cada decisão, em `supabase/README.md`.

O schema está aplicado no projeto Supabase `amjqibwoqfkbmtbyysgy`
("Prospecção e criação de site", eu-west-3, Postgres 17) através de 28 migrações.

Duas notas que condicionam o código das etapas seguintes:

- **A página pública lê-se de `generated_sites.content`**, não de `businesses`:
  um visitante anónimo não tem acesso à tabela de comércios. Tudo o que a landing
  page mostra tem de estar no JSON no momento da geração.
- **Visitas e cliques escrevem-se pelas funções `record_site_visit()` e
  `record_site_click()`**, com o `public_code` da página. Não há INSERT direto.

### Regras de migração

- Uma migração = um ficheiro **novo**. **Nunca se edita uma migração já aplicada.**
- Nomes: `NNNN_descricao_curta.sql`, numeração sequencial.
- Toda a tabela nova: `owner_id`, `created_at`, `updated_at`, trigger `set_updated_at`, RLS + políticas.
- Toda a chave estrangeira leva `on delete` explícito e um índice.

---

## 5. Comandos

```bash
npm install                 # instalar dependências
cp .env.local.example .env.local   # e preencher as chaves
npm run dev                 # servidor de desenvolvimento
npm run build               # build de produção (tem de passar antes de commit)
npm run lint                # ESLint
npm run typecheck           # tsc --noEmit
```

Migrações:

```bash
npm run db:push             # supabase db push
npm run db:types            # regenerar src/types/database.types.ts
```

Testes e varrimento:

```bash
npm test                    # vitest: grelha, telefones, classificação de site
npm run scan -- --help      # ajuda do varrimento

# Simulação: mostra a grelha e o custo, NÃO chama a API
npm run scan -- --zona "Braga centro" --ramo padaria --lat 41.5454 --lng -8.4265

# A sério (gasta dinheiro)
npm run scan -- --zona "Braga centro" --ramo padaria --lat 41.5454 --lng -8.4265 --confirmar

# Ver a lista ordenada por probabilidade de venda
npm run list
npm run list -- --filtro sem-site --ramo padaria
npm run list -- --id <uuid>          # explica a nota de um comércio
```

### As landing pages

- **A página pública lê-se do JSON em `content`, nunca da tabela `businesses`.**
  Um visitante anónimo não tem acesso aos comércios — essa é a lista de
  prospeção. Tudo o que a página mostra tem de estar no JSON no momento da
  geração.
- **As imagens têm três origens, e escolhe-se qual ao gerar.** Por esta ordem
  de qualidade: as fotografias do próprio comércio (Google), as de banco
  grátis (Pexels), e as imagens geradas em SVG (`lib/sites/imagens/arte.ts`),
  que não são fotografias e não fingem ser. A escolha é obedecida à letra.

  Esta regra dizia o contrário até setembro de 2026 — "não se usam fotografias
  do Google" — e foi mudada por decisão do dono do projeto. As condições que a
  tornavam arriscada continuam a valer e são cumpridas no código: o crédito de
  quem tirou a foto viaja agarrado à imagem desde que ela entra e aparece no
  rodapé da página; a imagem é servida pelo endereço temporário que a Google
  dá, nunca copiada para o nosso armazenamento.
- **As avaliações escritas do Google entram tal e qual.** Não passam pelo
  modelo, não se corrigem, não se cortam ao meio e não se escolhe só a parte
  boa. Uma avaliação arranjada deixa de provar seja o que for — e quem lê a
  página é o dono do comércio, que conhece os clientes pelo nome. O campo
  `reviews` é de um escalão de preço acima do resto, por isso pede-se comércio
  a comércio e nunca no varrimento.
- **O texto gerado só afirma o que os dados sustentam.** Um comércio sem
  avaliações não recebe uma frase sobre a sua reputação. Inventar aqui seria pôr
  o comerciante a apresentar-se com uma mentira.
- **Visitas e cliques passam pelas funções `record_site_visit` e
  `record_site_click`** (migração 0008), nunca por escrita direta. Não se guarda
  IP: cada visita leva um identificador de sessão que morre com o separador.

### O PDF de apresentação

Gera-se pelo **navegador**, com `@media print`, e não por um
Chromium no servidor. Três formatos: uma folha por secção (A4 em pé), paisagem
(como o site num computador) e telemóvel.

Os dois últimos desenham a página dentro de uma **moldura** com largura fixa, e
isso não é enfeite: ao imprimir, o Chrome mede as regras de "ecrã estreito"
contra a JANELA e não contra a folha — medido, não suposto. Uma folha do
tamanho de um telemóvel, sozinha, saía com a página larga espremida. Levar um Chromium para dentro de uma função serverless
custa dezenas de MB, arranques lentos e um limite de tempo que se atinge com
facilidade — para produzir o mesmo ficheiro que o "Guardar como PDF" do sistema
já faz, com texto selecionável e sem instalar nada.

### O funil

Oito estados, de "Por contactar" a "Ganho"/"Perdido". Um comércio **sem linha em
`deals` conta como "Por contactar"** — as linhas só nascem quando se mexe pela
primeira vez no estado, para um varrimento de 111 comércios não criar 111
negociações vazias nem um histórico com uma mudança que nunca aconteceu.

O histórico é escrito por um trigger na base de dados, não pela aplicação, e não
tem política de escrita para ninguém (migração 0005 e 0007). Nem a aplicação nem
eu conseguimos forjar ou apagar uma entrada.

### O score

0 a 100, cinco fatores: presença digital (40), atividade (25), reputação (15),
contactabilidade (10) e encaixe no produto (10). Um comércio fechado dá 0.

Cada fator devolve os pontos **e a razão em texto**, guardados em
`score_breakdown` — a nota tem sempre de ser explicável ao utilizador. Ao mudar
os pesos, subir `SCORE_VERSION` em `src/lib/scoring/score.ts`.

Testar o schema num Postgres qualquer, sem projeto Supabase — ver
`supabase/README.md`. O teste de fumo verifica deduplicação de regiões, colunas
geradas, validação de telefone e score, restrição do cardápio, histórico da
negociação escrito por trigger, registo público de visitas/cliques, relatório
mensal e isolamento entre donos.

Verificação rápida da ligação com a aplicação a correr: `GET /api/health`.

---

## 6. Regras de trabalho

1. **Ler este ficheiro no início de cada etapa.** Se o que aqui está contradiz o pedido,
   levantar a questão antes de codificar.
2. **Uma etapa entrega uma coisa completa.** Nada de metade da funcionalidade com um `TODO`.
3. **Antes de commit**: `npm run typecheck && npm run lint && npm run build` — os três a passar.
   Mexeu no schema? Correr também o teste de fumo de `supabase/tests/`.
4. **Nada de segredos no repositório.** Chaves novas entram em `.env.local.example` com valor vazio
   e são documentadas na secção 7.
5. **Alterou o schema?** Nova migração + regenerar `database.types.ts` + atualizar a secção 4 daqui.
6. **Alterou setup, variáveis de ambiente ou comportamento em runtime?** Atualizar este ficheiro
   e o `README` do projeto na mesma etapa.
7. **Não chamar o Google Places sem verificar a cache de região primeiro.**
   O varrimento arranca sempre em simulação; só `--confirmar` gasta dinheiro.
   O mapa de ramos em `src/lib/places/categories.ts` **não foi confirmado contra
   a documentação da Google** — um tipo inválido devolve 400 (não faturado) e o
   varrimento passa sozinho à pesquisa por texto, avisando no resumo.

   Há ramos com `includedTypes: []`, e isso é uma decisão e não um esquecimento:
   psicólogos, nutricionistas e harmonização facial não têm tipo no Google.
   Nesses vai-se direto à pesquisa por texto. **Nunca lhes dar um tipo parecido
   só para não ficar vazio** — um tipo errado mas VÁLIDO não dá erro nenhum,
   devolve os comércios errados, e paga-se por eles. As escolas de música,
   dança, teatro e línguas são o exemplo mais claro: o Google tem `school`, mas
   `school` é a escola primária da rua.

   São 48 ramos, em sete secções (`grupo`), e a caixa de escolha do painel usa
   essas secções. Numa lista corrida desse tamanho ninguém encontra nada, e
   escolher o ramo errado gasta dinheiro.

   `textQueryBR` é a mesma pergunta escrita como se diz no Brasil, e só existe
   onde difere mesmo: "ginásio"/"academia", "canalizador"/"encanador",
   "escola de condução"/"autoescola". A pesquisa por texto é literal — a palavra
   errada devolve meia dúzia de resultados e faz parecer que não há mercado.
8. **Não inventar dados de comércios.** O que não vier da API fica `null`.
9. **Commits**: mensagem descritiva no imperativo, em inglês, com prefixo de tipo
   (`feat:`, `fix:`, `docs:`, `chore:`).
10. **Branch de desenvolvimento**: `claude/commercial-prospecting-system-jwvvxk`.

---

## 7. Variáveis de ambiente

Modelo completo em `.env.local.example`.

Antes de tocar na chave da Google, ler as restrições documentadas em
`.env.local.example`: `Application restrictions = None` e `API restrictions`
limitada à "Places API (New)", mais uma quota diária de pedidos.

| Variável | Lado | Obrigatória | Para quê |
|----------|------|-------------|----------|
| `NEXT_PUBLIC_SUPABASE_URL` | Browser + servidor | Sim | URL do projeto Supabase |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Browser + servidor | Sim | Chave publishable (RLS aplica-se) |
| `SUPABASE_SERVICE_ROLE_KEY` | **Só servidor** | Sim | Tarefas de sistema. Ignora RLS — nunca expor |
| `GOOGLE_PLACES_API_KEY` | **Só servidor** | Sim | Busca de comércios |
| `NEXT_PUBLIC_SITE_URL` | Browser + servidor | Sim | Base dos links públicos das landing pages |
| `PROSPECTOR_EMAIL` | **Só servidor** | Sim | Utilizador com que o varrimento inicia sessão |
| `PROSPECTOR_PASSWORD` | **Só servidor** | Sim | Password desse utilizador |
| `SCAN_API_SECRET` | **Só servidor** | Sim | Cabeçalho `x-scan-secret` da rota que gasta dinheiro |
| `PUBLIC_SITE_DEFAULT_TTL_DAYS` | Só servidor | Não (30) | Validade por omissão das landing pages |
| `REGION_SEARCH_CACHE_DAYS` | Só servidor | Não (30) | Dias até uma região pesquisada ser considerada velha |
| `ANTHROPIC_API_KEY` | **Só servidor** | Não | Geração de páginas por IA. Sem ela, só esse botão avisa que falta |
| `PEXELS_API_KEY` | **Só servidor** | Não | Fotografias de banco grátis. Sem ela, as páginas usam as imagens geradas |

Na Vercel, as mesmas variáveis são definidas em **Project Settings → Environment Variables**
para Production, Preview e Development.

---

## 8. Estado das etapas

- [x] **Etapa 1** — Instruções do projeto, estrutura + ligação ao Supabase, schema em migrações SQL.
      Migrações aplicadas e teste de fumo corrido contra o Supabase real; linter de
      segurança sem erros.
- [x] **Etapa 2** — Google Places (API nova), grelha hexagonal, cache a dois níveis,
      classificação dos três casos de site, modo de simulação.
- [x] **Etapa 3** — Score 0-100 (5 fatores explicáveis) e lista ordenada.
- [x] **Etapa 4** — Gerador de landing pages, com modelo genérico e modelo de
      restauração (cardápio + pedido por WhatsApp), publicação com validade e
      registo de visitas e cliques.
- [x] **Etapa 5** — Apresentação A4 para guardar em PDF pelo navegador.
- [x] **Etapa 6** — Funil de negociação com histórico, filtros por estado, notas
      e próximo passo. Feita antes das etapas 4 e 5 a pedido: com 90 prospetos
      em lista, saber quem já foi contactado passou a ser o mais urgente.
- [x] **Etapa 7** — Relatórios mensais de visitas e cliques, a partir da vista
      `monthly_site_report`.

### Fase 1 do editor de sites

Pedida depois das sete etapas, a partir do fluxo de um concorrente (AIVIO-IA):
gerar → pré-visualizar → PDF → mandar ao dono → publicar → editar.

- [x] **Componente único da página** — `components/site/site-render.tsx`, com três
      modos: `public` (regista cliques), `preview` (não regista) e `print`
      (quebra de página por secção). O que o dono aprova no PDF é literalmente o
      que fica no ar, porque é o mesmo código.
- [x] **Temas** — seis paletas nomeadas e três tipos de letra em `lib/sites/theme.ts`,
      gravados na coluna `theme` que já existia vazia. São nomes de uma lista
      fechada de propósito: na Fase 2 é isto que a IA vai escolher a partir de
      uma frase, e escolher um nome de uma lista é fiável, escolher duas cores
      com contraste suficiente não é.
- [x] **Pré-visualização** — `/painel/site/[id]/previa`.
- [x] **PDF do site** — `/painel/site/[id]/pdf`, uma secção por folha. Distinto da
      apresentação da etapa 5: aquela é uma folha de venda *sobre* o negócio,
      para ti; esta é uma fotografia do *site*, para o dono.
- [x] **Editor** — `/painel/site/[id]/editar`. Os campos deste formulário **são** o
      formato do conteúdo: a geração automática, a edição à mão e a IA da Fase 2
      escrevem todos no mesmo sítio.
- [x] **Fotografias** — balde `fotos-sites` (migração 0011), escrita só do dono,
      leitura pública. Redimensionadas no browser antes de enviar e carregadas
      diretamente para o armazenamento, sem passar pelo servidor.

### Por fazer

- [x] **Fase 2** — geração por IA, nos dois modos, com seletor de modelo.

      `fields` — o modelo escreve subtítulo, texto de apresentação e três
      destaques, e escolhe paleta e tipo de letra de uma lista fechada. Entra
      nos mesmos campos que o editor edita, por isso a página continua
      editável. `html` — o modelo desenha a página inteira; grava em
      `custom_html` e a página deixa de ter campos (há um botão para voltar
      atrás sem perder o que havia).

      **Os factos nunca vêm do modelo.** Nome, telefone, morada e avaliação são
      do Google e são passados como dados; o modelo escreve à volta deles. Uma
      página que diga ao dono que ele abriu em 1987 quando abriu em 2019 perde
      a venda ali mesmo.

      **O HTML é limpo antes de gravar** (`src/lib/ai/sanitize.ts`), com uma
      lista do que passa e não do que se bloqueia. O pedido é escrito por uma
      pessoa e vai inteiro para dentro do prompt; o que sair daí é servido num
      endereço público. Limpa-se na escrita e não na leitura, para não haver
      caminho de leitura que alguém se esqueça de proteger — e por isso os
      testes atacam o sanitizador a sério.

      Modelo por omissão: `claude-opus-5`. Baixar de modelo é decisão de quem
      paga, tomada no ecrã com o preço à frente dos olhos. O modelo usado, o
      pedido e os tokens ficam gravados com a página.

- [x] **Mensagens de abordagem** — a IA escreve a primeira mensagem de WhatsApp
      para cada comércio, em três versões com ângulos diferentes.

      Havia aqui uma frase fixa em `firstContactMessage`, que servia para tudo e
      por isso não servia para nada: mandada a trinta comércios seguidos lê-se
      como o molde que é. O que substitui é o que já se sabe daquele comércio em
      concreto — 214 avaliações e nenhuma página onde as mostrar, um Instagram
      que não leva a lado nenhum, uma landing page já feita e à espera de ser
      vista.

      **O país decide o português.** `PT` e `BR` têm blocos de regras separados
      em `src/lib/ai/abordagem-texto.ts`: tratamento, cumprimento e vocabulário
      (telemóvel/celular, morada/endereço). Quem lê sabe em dois segundos se a
      mensagem foi escrita para ele ou despejada de uma lista.

      **Guardar é obrigatório**, pela mesma razão do cache do Google: cada
      geração é uma chamada paga. Abrir a ficha lê de `outreach_messages`; só o
      botão "Escrever outras" gasta dinheiro.

      As três aparecem editáveis na ficha, com botão de copiar e de enviar no
      WhatsApp — e o que vai no link é o texto depois de editado, não o que o
      modelo escreveu.

- [x] **Do prospeto à venda** — as quatro peças que faltavam entre ter a lista
      e receber dinheiro.

      **Fila de contacto** (`/painel/contactar`): um comércio de cada vez, com
      o telefone como botão e a mensagem já escrita, e três desfechos. Contactar
      custava sete passos e por isso não se contactava ninguém. "Não atende" não
      é "não quer": o primeiro continua por contactar com data marcada, o
      segundo é perdido. Carrega vinte e cinco de uma vez e avança no browser —
      se cada botão esperasse pelo servidor, a pausa fazia desistir ao décimo.

      **Registar venda**: valor, moeda do país, mensal ou único. E a página
      vendida deixa de expirar — sem `sold_at`, o site de quem pagou desaparecia
      sozinho no fim da validade, sem aviso.

      **Abriram a tua página**: as visitas e cliques eram registados desde o
      princípio e nunca se mostravam. É o melhor sinal de compra que há e perde
      metade do valor em vinte e quatro horas.

      **Para hoje**: o "próximo passo · quando" existia na ficha e não avisava
      ninguém. O atrasado vem primeiro e vem marcado.

- [x] **O que lhe podes vender** — catálogo de serviços com regras sobre os
      dados que já temos.

      A ficha do comércio passa a responder à pergunta que se faz ao abri-la:
      "o que é que eu ofereço a este?". Site, ficha do Google, campanha de
      avaliações, Instagram, cardápio digital, domínio, fotografia.

      **Sem IA.** Os sinais já estão guardados e uma regra escrita à mão é mais
      barata, instantânea e explicável — dá para dizer ao comerciante porque é
      que se está a falar daquilo, o que é metade da venda.

      Três níveis, e a diferença entre eles é honestidade: `forte` vê-se nos
      dados e tem frase pronta ("a sua ficha não tem horário"); `possivel` é
      uma pergunta a fazer; `nao` não se mostra. Um palpite vestido de facto é
      o caminho mais rápido para dizer uma coisa errada a quem sabe a verdade.

      Só se usam sinais FIÁVEIS. `google_photos` ficou de fora de propósito:
      só se preenche quando se gera um site, portanto "não temos fotos" quer
      dizer "não perguntámos" e não "ele não tem" — uma regra assente nisso
      mentia em 99% dos casos.

- [x] **O que já lhe vendeste** — `client_services` e a carteira em
      `/painel/clientes`.

      O catálogo diz o que **podes** oferecer; isto regista o que **já**
      vendeste. Uma linha por (comércio, serviço) em vez de um valor único no
      `deals`: um cliente compra site em Março e cardápio em Julho, e um campo
      só não guarda isso. As colunas `sale_value_cents` e `sale_is_monthly` do
      `deals` foram removidas na migração 0025 — não havia nenhuma venda
      registada, portanto não se perdeu nada.

      A carteira é **uma coluna por serviço**, para se ler de cima a baixo à
      procura de BURACOS: quem tem site e não tem cardápio, quem tem cardápio e
      nunca fez a ficha do Google. É a venda mais barata que há — a prospeção
      já foi paga e a conversa já existe.

      **Os totais são por moeda, nunca um só.** Há clientes em Portugal e no
      Brasil; somar cêntimos com centavos dava um número que não existe.

- [x] **O aspecto novo, vindo do desenho** — sistema de cores e tipos de letra
      do "CRM Presença" (Claude Design), menu lateral retráctil e cabeçalho
      fixo.

      As cores estão em `src/app/globals.css` como tokens em oklch, com o tema
      claro escrito à mão e não derivado do escuro — um claro calculado a partir
      do escuro fica sempre cinzento. Escuro é o normal; a escolha à mão fica no
      `localStorage` e é aplicada por um script antes do primeiro desenho, senão
      quem escolheu claro vê o ecrã escuro a piscar em cada página.

      O tema NÃO é estado do React. Quem manda é o `data-theme` no `<html>`, e
      o ícone do botão é escolhido por CSS pelas mesmas regras que escolhem as
      cores. Duas fontes de verdade davam um desenho no servidor que não sabia
      qual era o tema.

      A moldura vive em `src/app/painel/layout.tsx`: as páginas do painel já não
      trazem cabeçalho nem largura máxima próprios. O menu só lista páginas que
      existem — um item que abre um ecrã vazio é pior do que não existir.

- [x] **Os quinze ecrãs do desenho, todos no menu.**

      O painel passou a ser SÓ o painel: a tabela de comércios mudou-se para
      `/painel/comercios` e o varrimento para `/painel/varrimento`. Responde a
      uma pergunta — a quem ligo agora — e nada obriga a rolar antes disso.

      Com dados a sério: painel, fila, comércios, ficha, carteira, funil,
      varrimento e custos, landing pages, relatórios.

      Ainda sem dados, e no menu na mesma: robô, instâncias de WhatsApp,
      calendário de conteúdo, suporte, equipa, cobrança, perfil. Cada um traz
      uma tira `PorLigar` a dizer o que falta, e no menu leva um `?`. Estarem lá
      permite ver o caminho todo e discutir o desenho; a tira impede que um
      número de exemplo passe por verdade.

      O cartão "O teu dia" ficou primeiro com os valores a `—`, e passou a ler
      dados a sério na migração 0026.

- [x] **Progresso a sério** — `contact_events` e `/painel/perfil`.

      O que existia não chegava, e a razão é subtil: `deal_stage_events` guarda
      MUDANÇAS DE ETAPA, e dos três desfechos da fila só dois mudam a etapa.
      "Adiado" não muda nada de propósito — quem não atendeu continua por
      contactar — portanto ligar a quem não atende não deixava rasto. Contar por
      aí dava um número abaixo da verdade exactamente nos dias maus, em que
      ninguém atende. Um contador de esforço que castiga os dias difíceis é pior
      do que não ter contador.

      `deals.last_contacted_at` também não servia: guarda só o ÚLTIMO contacto
      de cada comércio.

      Agora `registarDesfecho` escreve uma linha em `contact_events` por cada
      desfecho, os três. Falhar essa escrita não desfaz o contacto — perder uma
      linha de estatística não vale rebentar o ecrã a meio de trinta chamadas.

      As contas vivem em `src/lib/progresso/calculo.ts`, sem base de dados pelo
      meio e com 18 testes. Tudo em dias LOCAIS: um contacto às 23:30 em Lisboa
      pertence a esse dia, e em UTC já era o seguinte — o que partia a sequência
      de quem trabalha à noite. A sequência actual aceita começar ONTEM, senão
      às nove da manhã uma sequência de catorze dias aparecia a zero. E de zero
      para alguma coisa não é "+100%", é "os primeiros": uma percentagem
      calculada sobre zero é uma mentira com ar de exactidão.

      Sem retroactivos. O que se fez antes não foi registado e não se inventa.

- [x] **Suporte** — `support_requests` e `/painel/suporte`.

      Numa agência de mensalidades o dinheiro não se perde na venda, perde-se
      depois: um pedido esquecido numa conversa de WhatsApp é uma mensalidade
      cancelada três meses mais tarde, sem ninguém perceber porquê.

      `due_at` é o compromisso e `closed_at` é quando ficou feito. Com os dois há
      a única pergunta que importa — fechou-se a tempo? — e não se guarda um
      terceiro campo calculado, que mais cedo ou mais tarde discordava dos
      outros dois.

      O prazo é OBRIGATÓRIO e escolhe-se em quatro botões, não num calendário:
      um pedido sem prazo fica para depois para sempre, e escolher uma data num
      telemóvel entre duas chamadas é trabalho a mais.

      "No prazo" julga-se pelo DIA e não pela hora. Prometer quinta e entregar
      quinta às 18h é ter cumprido, mesmo que o prazo tenha sido criado às 9h.

      Sem responsável por enquanto: a equipa é uma pessoa, e uma coluna que só
      pode ter um valor não é informação. Entra com os papéis.

      O painel ganhou o cartão dos pedidos e a segunda barra do "O teu dia" —
      fechados no prazo. Está ao lado dos contactos de propósito: reter vale
      tanto como vender, e um painel que só mede vendas novas ensina a ignorar
      quem já paga.

- [x] **Cobrança** — `client_payments` e `/painel/cobranca`.

      O QUE cada cliente paga já estava em `client_services`. Faltava saber se o
      mês está pago.

      As mensalidades de um mês CALCULAM-SE a partir de `client_services` — quem
      tinha serviço activo naquele mês — e a tabela guarda só o desfecho. Não há
      geração mensal de linhas: um trabalho que corre uma vez por mês é um
      trabalho que mais cedo ou mais tarde falha em silêncio, e o mês fica sem
      cobranças sem ninguém dar por isso. Sem linha, o estado é `pendente`.

      `amount_cents` é a excepção e fica CONGELADO ao marcar. Se em Janeiro ele
      pagava 30 € e em Abril passou a 45, Janeiro tem de continuar a dizer 30
      para sempre — um histórico que se recalcula com os preços de hoje não é um
      histórico. A linha avisa quando o valor de hoje é outro.

      Duas regras de mês, escritas e testadas: vendido durante o mês cobra-se
      nesse mês (adiar era oferecer trabalho), e cancelado durante o mês cobra-se
      nesse mês na mesma (o mês foi servido). Sem proporcionalidade: meio mês
      custa um mês, dos dois lados.

      É à mão de propósito. Ligar isto a um sistema de pagamentos é um projecto
      inteiro, e o valor não está em automatizar a cobrança — está em SABER quem
      não pagou. Isso resolve-se com três botões.

- [ ] **Fase 3** — sites de várias páginas, para clientes maiores.

---

## 9. Nota sobre o repositório

Este repositório continha antes o projeto **MoneyPrinter** (Python/Flask, geração de vídeo).
Esse código continua em `Backend/`, `Frontend/` e `docs/` e **não é tocado** por este projeto.
O `CLAUDE.md` da raiz descreve o MoneyPrinter; **para o sistema de prospeção, este ficheiro manda.**
