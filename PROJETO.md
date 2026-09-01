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

### Chaves e segredos

- `NEXT_PUBLIC_*` → vai para o browser. Só a URL do Supabase e a chave anónima.
- Tudo o resto (service role, Google Places) é **exclusivamente de servidor**.
  **A service role key nunca é importada num Client Component nem prefixada com `NEXT_PUBLIC_`.**
- As variáveis são validadas no arranque em `src/lib/env.ts`. Falta uma → o processo falha logo,
  em vez de rebentar a meio de um pedido.

---

## 3. Estrutura do projeto

```
src/
  app/                     # App Router (rotas, layouts, route handlers)
  lib/
    env.ts                 # validação das variáveis de ambiente
    supabase/
      client.ts            # cliente browser  (chave anónima)
      server.ts            # cliente servidor (cookies, chave anónima, respeita RLS)
      admin.ts             # cliente service role — só servidor, ignora RLS
  types/
    database.types.ts      # tipos gerados a partir do schema
  app/api/health/route.ts  # verificação da ligação ao Supabase
  proxy.ts                 # refresh da sessão Supabase (o antigo middleware.ts)
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
| Client Component | `createBrowserClient()` de `lib/supabase/client` | Chave anónima, RLS ativa |
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
8. **Não inventar dados de comércios.** O que não vier da API fica `null`.
9. **Commits**: mensagem descritiva no imperativo, em inglês, com prefixo de tipo
   (`feat:`, `fix:`, `docs:`, `chore:`).
10. **Branch de desenvolvimento**: `claude/commercial-prospecting-system-jwvvxk`.

---

## 7. Variáveis de ambiente

Modelo completo em `.env.local.example`.

| Variável | Lado | Obrigatória | Para quê |
|----------|------|-------------|----------|
| `NEXT_PUBLIC_SUPABASE_URL` | Browser + servidor | Sim | URL do projeto Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Browser + servidor | Sim | Chave anónima (RLS aplica-se) |
| `SUPABASE_SERVICE_ROLE_KEY` | **Só servidor** | Sim | Tarefas de sistema. Ignora RLS — nunca expor |
| `GOOGLE_PLACES_API_KEY` | **Só servidor** | Sim | Busca de comércios |
| `NEXT_PUBLIC_SITE_URL` | Browser + servidor | Sim | Base dos links públicos das landing pages |
| `PUBLIC_SITE_DEFAULT_TTL_DAYS` | Só servidor | Não (30) | Validade por omissão das landing pages |
| `REGION_SEARCH_CACHE_DAYS` | Só servidor | Não (30) | Dias até uma região pesquisada ser considerada velha |

Na Vercel, as mesmas variáveis são definidas em **Project Settings → Environment Variables**
para Production, Preview e Development.

---

## 8. Estado das etapas

- [x] **Etapa 1** — Instruções do projeto, estrutura + ligação ao Supabase, schema em migrações SQL.
- [ ] **Etapa 2** — Integração com o Google Places e cache de regiões.
- [ ] **Etapa 3** — Cálculo do score e lista ordenada de comércios.
- [ ] **Etapa 4** — Gerador de landing pages (modelo geral + modelo restaurante/padaria).
- [ ] **Etapa 5** — Exportação em PDF de apresentação.
- [ ] **Etapa 6** — Funil de negociação com histórico.
- [ ] **Etapa 7** — Relatórios mensais de visitas e cliques.

---

## 9. Nota sobre o repositório

Este repositório continha antes o projeto **MoneyPrinter** (Python/Flask, geração de vídeo).
Esse código continua em `Backend/`, `Frontend/` e `docs/` e **não é tocado** por este projeto.
O `CLAUDE.md` da raiz descreve o MoneyPrinter; **para o sistema de prospeção, este ficheiro manda.**
