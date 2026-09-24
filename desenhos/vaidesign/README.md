# Desenhos da VaiDesign

Os ficheiros saídos do Claude Design que ainda não viraram código, guardados
aqui para não se perderem num download.

O que já é código vive noutro sítio: os artboards das cinco páginas do site
estão em `src/lib/vaidesign/desenho/artboards.ts`, e as fotografias em
`public/vaidesign/`.

| Ficheiro | O que é |
|---|---|
| `Proposta.dc.html` | O modelo de proposta a enviar ao cliente quando se fecha um negócio. Quatro folhas: capa, quem somos e o pedido, prazo e valor, aceite. Os valores que lá estão são de exemplo (Padaria Central, 2026-001). |

## A proposta

Por enquanto preenche-se à mão no Claude Design e exporta-se em PDF. O passo
seguinte, quando houver propostas que cheguem para o justificar, é gerá-la a
partir do sistema: o cliente, o modelo escolhido, o preço e o número de
proposta já estão todos na base de dados, e o número podia sair do mesmo
contador que dá os códigos de cliente (`next_client_code`).
