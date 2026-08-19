# Prospecção Comercial

Aplicação web de prospecção comercial para uso próprio: procura negócios por
segmento e região na Google Places API, guarda-os como leads sem duplicados,
destaca os que têm presença digital fraca e gera mensagens de primeira
abordagem para copiar.

**Nunca envia mensagens** — nem automaticamente, nem em massa. O envio é sempre
manual, feito por si, fora da ferramenta. Não faz raspagem de redes sociais.

```bash
cp ../.env.example ../.env     # preencher o bloco de prospecção
uv sync
uv run python backend/app.py   # http://localhost:8090
```

Para produção corre no Vercel (função Python única em `api/index.py`) com o
Postgres do Supabase. Aponte o *Root Directory* do projecto Vercel a esta
pasta e configure as variáveis de ambiente; `GET /api/health` diz o que falta.

Guia completo, deploy, variáveis de ambiente e API:
[`docs/prospector.md`](../docs/prospector.md).
