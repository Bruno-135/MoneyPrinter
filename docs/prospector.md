# Prospecção Comercial

Aplicação web de prospecção comercial para uso próprio, independente do
pipeline de vídeo do MoneyPrinter. Vive em `Prospector/` e tem a sua própria
base de dados, API e frontend.

Procura negócios por segmento e região através da Google Places API, guarda
cada resultado como lead sem duplicados, marca os alvos com presença digital
fraca e gera três variações de mensagem de primeira abordagem para copiar.

**A aplicação nunca envia mensagens.** Não há envio automático nem em massa: as
mensagens são apresentadas para serem copiadas e enviadas à mão, fora da
ferramenta. Também não há raspagem de redes sociais — as fontes são a API
oficial do Google Places e, quando pedido, o site oficial do próprio negócio.

## Instalação

### 1. Base de dados (Supabase)

Aplique o esquema ao projecto Supabase. Pelo editor de SQL do Supabase:

```sql
-- cole o conteúdo de Prospector/migrations/001_initial.sql
```

As tabelas ficam no schema `prospeccao`, fora do `public`, para não colidirem
com outros projectos e para não serem expostas pela API REST do Supabase. O
backend liga-se directamente ao Postgres.

Se preferir, o backend cria as tabelas sozinho no primeiro arranque
(`init_db()`); a migração existe para quem quer controlar o esquema à mão.

### 2. Configuração

Copie `.env.example` para `.env` e preencha o bloco de prospecção:

| Variável | Obrigatória | Descrição |
|---|---|---|
| `PROSPECTOR_DATABASE_URL` | recomendada | Ligação ao Postgres do Supabase. Vazio = SQLite local. |
| `PROSPECTOR_DB_SCHEMA` | não | Schema das tabelas. Omissão: `prospeccao`. |
| `PROSPECTOR_USERNAME` | sim | Utilizador criado no primeiro arranque. |
| `PROSPECTOR_PASSWORD` | sim | Password desse utilizador. |
| `GOOGLE_PLACES_API_KEY` | sim | Chave da **Places API (New)** na Google Cloud Console. |
| `PROSPECTOR_SENDER_NAME` | não | Nome que assina as mensagens. Omissão: `Bruno`. |
| `PROSPECTOR_PORT` | não | Porta da aplicação. Omissão: `8090`. |
| `PROSPECTOR_PLACES_REGION` / `_LANGUAGE` | não | Omissão: `PT` / `pt-PT`. |
| `PROSPECTOR_PLACES_MAX_RESULTS` | não | Resultados por pesquisa. Omissão: `60`. |
| `PROSPECTOR_SESSION_TTL_HOURS` | não | Validade da sessão. Omissão: `720` (30 dias). |
| `PROSPECTOR_OUTREACH_USE_LLM` | não | Usar Ollama nas mensagens. Omissão: `false`. |
| `PROSPECTOR_OLLAMA_MODEL` | não | Modelo do Ollama. Omissão: `OLLAMA_MODEL`. |
| `PROSPECTOR_ENRICHMENT_ENABLED` | não | Camada de registo comercial. Omissão: `false`. |
| `PROSPECTOR_AUTO_INIT_DB` | não | Criar esquema no arranque. Omissão: `true`. |

A ligação do Supabase encontra-se em *Project Settings → Database → Connection
string → URI*. Troque o prefixo `postgresql://` por `postgresql+psycopg://`:

```
PROSPECTOR_DATABASE_URL="postgresql+psycopg://postgres.<ref>:<password>@aws-0-eu-west-1.pooler.supabase.com:6543/postgres"
```

### 3. Arrancar

```bash
uv sync
uv run python Prospector/backend/app.py
```

Abra `http://localhost:8090`. O frontend é servido pelo próprio backend, por
isso não é preciso um segundo servidor.

Para criar outro utilizador ou repor uma password:

```bash
uv run python Prospector/backend/create_user.py <utilizador> <password>
```

## Deploy (Vercel + Supabase)

A aplicação corre no Vercel como uma função Python única (`api/index.py`), que
serve tanto a API como o frontend. A base de dados é o Postgres do Supabase.

### 1. Supabase

Crie o projecto e aplique `Prospector/migrations/001_initial.sql` no editor SQL.
Se preferir, salte este passo: com `PROSPECTOR_AUTO_INIT_DB=true` (omissão) a
aplicação cria o schema e as tabelas no primeiro arranque.

A ligação está em *Project Settings → Database → Connection string*. Use a do
**Transaction pooler** (porta `6543`) — é a indicada para funções serverless —
e troque o prefixo `postgresql://` por `postgresql+psycopg://`.

### 2. Projecto no Vercel

Aponte o *Root Directory* do projecto Vercel a `Prospector/`. O `vercel.json`
encaminha todos os pedidos para a função e o `requirements.txt` instala apenas
as dependências desta aplicação — nada do MoneyPrinter é instalado.

### 3. Variáveis de ambiente no Vercel

| Variável | Valor |
|---|---|
| `PROSPECTOR_DATABASE_URL` | ligação do *transaction pooler* do Supabase, com `postgresql+psycopg://` |
| `PROSPECTOR_USERNAME` | o seu utilizador |
| `PROSPECTOR_PASSWORD` | a sua password |
| `GOOGLE_PLACES_API_KEY` | chave da Places API (New) |
| `PROSPECTOR_SENDER_NAME` | nome que assina as mensagens |

Depois de as gravar, faça *Redeploy* — as variáveis só entram numa build nova.

### 4. Verificar

`GET /api/health` diz o que está bem e o que falta:

```json
{"health": {"database": {"reachable": true}, "placesConfigured": true, "userConfigured": true}}
```

Se `database.reachable` for `false`, o campo `error` explica porquê — quase
sempre a ligação errada (use a do *transaction pooler*, não a directa).

### Notas sobre o ambiente serverless

- As ligações usam `NullPool` e desligam prepared statements nomeados, como o
  pooler do Supabase em modo transacção exige.
- O Ollama não é alcançável a partir do Vercel, por isso as mensagens são
  escritas pelos modelos de texto internos. `PROSPECTOR_OUTREACH_USE_LLM` está
  desligado por omissão precisamente por isso; ligue-o apenas onde tenha Ollama.
- A procura de email no site do negócio faz vários pedidos HTTP e é a operação
  mais lenta; a função tem `maxDuration` de 60 segundos.

## Como funciona

### Busca de contactos

Preencha o segmento (ex.: `clínicas de estética`) e a região (ex.: `Vila Nova
de Gaia`), escolha se quer pessoa jurídica, pessoa física ou as duas, e se quer
ver apenas negócios com presença digital fraca.

A pesquisa consulta a Google Places API (Text Search v1) e traz nome, telefone,
morada, site, número de avaliações e nota. Os filtros são aplicados **antes** de
gravar: só entram na base os contactos que interessam.

Se marcar *Procurar email no site do próprio negócio*, a aplicação lê a página
inicial e as páginas de contacto do site que o Google indica como oficial,
respeitando o `robots.txt` desse domínio, e guarda o email encontrado com a
fonte correspondente. Nunca toca em redes sociais.

### Deduplicação

Cada lead tem uma chave de deduplicação: o identificador do Google quando
existe, ou o par nome+morada normalizado (sem acentos nem pontuação). Uma nova
pesquisa actualiza o lead existente em vez de o duplicar.

Ao actualizar, os campos geridos por si — estado, anotações, data do último
contacto — nunca são tocados, e qualquer campo que tenha editado à mão fica
marcado como `manual` e deixa de ser sobreposto.

### Fonte de cada dado

Cada campo guarda a sua própria etiqueta de proveniência em `field_sources`, e
a interface mostra-a ao lado do valor:

| Fonte | Etiqueta na interface |
|---|---|
| `google_places` | Google Maps |
| `site_do_negocio` | Site do próprio negócio |
| `manual` | Introduzido manualmente |
| `derivado` | Calculado pela aplicação |
| `registo_comercial_pt` | Registo Comercial (PT) |

### Presença digital fraca

Cada lead recebe um score de 0 a 100 — quanto mais alto, mais fraca a presença
digital e mais prioritário o alvo:

| Sinal | Peso |
|---|---|
| Sem site | 40 |
| Sem avaliações | 30 |
| Menos de 10 avaliações | 20 |
| Sem telefone | 15 |
| Perfil sem morada | 10 |
| Sem nota atribuída | 5 |

A partir de 50 o lead é marcado como presença digital fraca. Os limites estão
em `Prospector/backend/scoring.py`.

### Pessoa jurídica ou pessoa física

A distinção é uma heurística sobre o nome e os tipos devolvidos pelo Google:
sufixos de sociedade (`Lda`, `Unipessoal`, `S.A.`) indicam pessoa jurídica;
títulos profissionais (`Dr.`, `Dra.`, `Eng.`) indicam pessoa física. Cada lead
mostra o nível de confiança da classificação e pode ser corrigido à mão. A
confirmação definitiva fica a cargo da camada de enriquecimento.

### Gestão de leads

Cada lead tem estado (novo, contactado, em conversa, fechado, descartado),
anotações livres e data do último contacto. O painel mostra a contagem por
estado, o total, quantos têm presença digital fraca e quantos não têm site.

### Geração de abordagem

Escolha um lead, o canal (email ou WhatsApp) e descreva numa frase o que está a
oferecer. A aplicação gera três variações — directa, a partir de algo observado
no perfil, e com contexto local — cada uma com botão para copiar.

Se houver um Ollama acessível, é ele a escrever; caso contrário são usados os
modelos de texto internos, que produzem sempre as três variações. Nenhum dos
caminhos envia seja o que for.

### Camada de enriquecimento (preparada, desativada)

`Prospector/backend/enrichment.py` define o contrato de uma fonte de registo
comercial e um `PortugueseRegistryEnricher` por implementar, que vai cruzar o
nome da empresa com o registo comercial público português para confirmar a
razão social, o NIPC e a situação de actividade.

Está desativada: o endpoint `POST /api/leads/<id>/enrich` responde `503` e o
botão na interface aparece inerte. Para a activar, implemente `lookup` com um
serviço oficial e defina `PROSPECTOR_ENRICHMENT_ENABLED=true`.

## API

Todas as respostas seguem `{"status": "success|error", ...}`. Excepto
`/api/config`, todos os endpoints exigem `Authorization: Bearer <token>`.

| Método | Endpoint | Descrição |
|---|---|---|
| `GET` | `/api/health` | Diagnóstico: base de dados, chave do Places, utilizador. |
| `GET` | `/api/config` | Configuração pública (estados, canais, se o enriquecimento está ligado). |
| `POST` | `/api/auth/login` | Autentica e devolve o token de sessão. |
| `POST` | `/api/auth/logout` | Revoga o token actual. |
| `GET` | `/api/auth/me` | Utilizador da sessão. |
| `POST` | `/api/search` | Pesquisa no Google Places e grava os leads. |
| `GET` | `/api/leads` | Lista leads (`status`, `entityFilter`, `weakOnly`, `q`). |
| `GET` | `/api/leads/<id>` | Detalhe de um lead. |
| `PATCH` | `/api/leads/<id>` | Actualiza estado, anotações, data de contacto ou dados. |
| `DELETE` | `/api/leads/<id>` | Remove o lead. |
| `GET` | `/api/dashboard` | Contagens do painel. |
| `POST` | `/api/leads/<id>/outreach` | Gera três variações de mensagem. |
| `POST` | `/api/leads/<id>/enrich` | Enriquecimento pelo registo comercial (desativado). |

## Módulos

| Ficheiro | Responsabilidade |
|---|---|
| `backend/app.py` | Aplicação Flask, endpoints e serviço do frontend |
| `backend/config.py` | Leitura da configuração do `.env` |
| `backend/db.py` | Motor SQLAlchemy, schema e sessões |
| `backend/models.py` | Tabelas: utilizadores, sessões, leads, pesquisas, rascunhos |
| `backend/auth.py` | Passwords, tokens de sessão e protecção dos endpoints |
| `backend/repository.py` | Deduplicação, filtros, painel e persistência |
| `backend/places.py` | Cliente da Google Places API |
| `backend/scoring.py` | Score de presença digital e classificação PJ/PF |
| `backend/website_email.py` | Email no site oficial do negócio |
| `backend/messaging.py` | Três variações de mensagem por lead |
| `backend/enrichment.py` | Registo comercial português (preparado, desativado) |
| `backend/create_user.py` | Criar utilizadores e repor passwords |
| `frontend/` | Interface (`index.html`, `styles.css`, `app.js`) |
| `api/index.py` | Ponto de entrada WSGI no Vercel |
| `vercel.json` | Encaminhamento e limites da função |
| `migrations/` | Esquema SQL para o Supabase |

## Testes

A aplicação tem a sua própria suite, separada da do MoneyPrinter porque os dois
backends têm módulos com o mesmo nome:

```bash
uv run pytest Prospector/tests -q    # suite da prospecção
uv run pytest -q                     # suite do MoneyPrinter
```
