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

Nove tabelas, todas com `owner_id`, `created_at`, `updated_at` e RLS ativa.

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

Vista `monthly_site_report` agrega visitas e cliques por site e por mês
(`security_invoker = on`, portanto respeita a RLS).

Detalhe tabela a tabela, com o porquê de cada decisão, em `supabase/README.md`.

O schema está aplicado no projeto Supabase `amjqibwoqfkbmtbyysgy`
("Prospecção e criação de site", eu-west-3, Postgres 17) através de 9 migrações.

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
- **Não se usam fotografias do Google.** As imagens do Places têm licença própria
  e condições de atribuição; pô-las numa página comercial vendida a terceiros
  seria um problema legal à espera de acontecer. A página assenta em tipografia
  e no que o comércio tem de concreto. As fotografias vêm do comerciante depois
  de fechar negócio.
- **O texto gerado só afirma o que os dados sustentam.** Um comércio sem
  avaliações não recebe uma frase sobre a sua reputação. Inventar aqui seria pôr
  o comerciante a apresentar-se com uma mentira.
- **Visitas e cliques passam pelas funções `record_site_visit` e
  `record_site_click`** (migração 0008), nunca por escrita direta. Não se guarda
  IP: cada visita leva um identificador de sessão que morre com o separador.

### O PDF de apresentação

Gera-se pelo **navegador**, com `@media print` numa página A4, e não por um
Chromium no servidor. Levar um Chromium para dentro de uma função serverless
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

- [ ] **Fase 2** — caixa de texto livre com IA, em dois modos: preencher o modelo
      (barato, continua editável campo a campo) e gerar HTML livre (mais
      variedade, deixa de ser editável por campos). Precisa de uma chave da API
      da Anthropic com faturação; até lá as páginas geram-se pelo botão ou à mão.
- [ ] **Fase 3** — sites de várias páginas, para clientes maiores.

---

## 9. Nota sobre o repositório

Este repositório continha antes o projeto **MoneyPrinter** (Python/Flask, geração de vídeo).
Esse código continua em `Backend/`, `Frontend/` e `docs/` e **não é tocado** por este projeto.
O `CLAUDE.md` da raiz descreve o MoneyPrinter; **para o sistema de prospeção, este ficheiro manda.**
