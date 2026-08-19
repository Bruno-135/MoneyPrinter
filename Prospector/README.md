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

Guia completo, variáveis de ambiente e API: [`docs/prospector.md`](../docs/prospector.md).
