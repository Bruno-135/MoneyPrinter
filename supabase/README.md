# Base de dados

Schema do sistema de prospeção comercial, em migrações SQL versionadas.

## Migrações

| Ficheiro | Conteúdo |
|----------|----------|
| `0001_extensions_and_helpers.sql` | Extensões, enums (`site_template`, `site_status`, `deal_stage`, `click_target`) e funções auxiliares |
| `0002_searched_regions.sql` | `searched_regions` (cache de zona+ramo) e `region_searches` (respostas em bruto da API) |
| `0003_businesses.sql` | `businesses` — comércios, presença digital, telefone/país separados, score |
| `0004_generated_sites_and_menu.sql` | `generated_sites` (conteúdo JSON, código público, validade) e `menu_items` |
| `0005_deals_and_history.sql` | `deals` (estado atual) e `deal_stage_events` (histórico, escrito por trigger) |
| `0006_analytics.sql` | `site_visits`, `site_clicks` e a vista `monthly_site_report` |
| `0007_row_level_security.sql` | RLS e políticas por `owner_id`, mais leitura pública das páginas publicadas |
| `0008_public_tracking.sql` | `record_site_visit()` / `record_site_click()` para visitantes anónimos |

**Nunca editar uma migração já aplicada.** Alteração ao schema = ficheiro novo.

## Aplicar

```bash
supabase link --project-ref <ref>
supabase db push
npm run db:types          # regenerar src/types/database.types.ts
```

## Decisões que valem uma explicação

- **`owner_id` em todas as tabelas, com RLS desde o primeiro dia.** Hoje há um
  utilizador só. Ligar a RLS agora torna o salto para SaaS multiutilizador uma
  mudança de zero linhas de código de aplicação.
- **Telefone em quatro colunas** (`phone_raw`, `phone_e164`, `phone_country_code`,
  `phone_country`). PT e BR têm formatos nacionais diferentes e ambíguos entre si;
  o país nunca se infere do número.
- **`google_raw` guarda a resposta completa** do Places, em `businesses` e em
  `region_searches`. Mudar a fórmula do score ou mostrar um campo novo passa a
  ser reprocessar JSON, não gastar quota outra vez.
- **`searched_regions.search_key` é uma coluna gerada.** A normalização (minúsculas,
  espaços, coordenadas a 4 casas) acontece na base de dados, portanto a aplicação
  não consegue criar dois registos "iguais" por descuido.
- **Colunas geradas para `has_website`, `has_social` e `is_food_service`.** São
  derivadas puras dos dados do Google; ficam sempre coerentes e não dependem de a
  aplicação se lembrar de as atualizar.
- **O histórico da negociação é escrito por trigger SECURITY DEFINER** e
  `deal_stage_events` não tem política de INSERT/UPDATE/DELETE para ninguém.
  Um histórico que se pode editar não é um histórico.
- **Visitas e cliques passam por funções SECURITY DEFINER.** Um visitante anónimo
  regista o evento com o código público da página; `owner_id` e `site_id` são
  derivados pela função, portanto não há forma de inserir eventos falsos noutro site.
- **Dinheiro em cêntimos** (`price_cents`, `expected_value_cents`) + coluna `currency`,
  porque PT usa EUR e BR usa BRL.

## Testar o schema localmente

Não é preciso um projeto Supabase: um Postgres 15+ chega, com os stubs de
`auth.users`, `auth.uid()` e dos papéis `anon`/`authenticated`.

```bash
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/tests/00_supabase_stubs.sql
for f in supabase/migrations/*.sql; do
  psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$f"
done
psql "$DATABASE_URL" -f supabase/tests/schema_smoke_test.sql
```

`schema_smoke_test.sql` verifica, numa base vazia: deduplicação de regiões,
frescura da cache, colunas geradas, validação de telefone e de score, código
público e validade dos sites, restrição do cardápio ao modelo `food_service`,
histórico da negociação escrito por trigger e impossível de forjar, registo
público de visitas/cliques, relatório mensal e isolamento entre dois donos.
