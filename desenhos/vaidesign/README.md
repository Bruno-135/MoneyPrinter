# Desenhos da VaiDesign

Os ficheiros saídos do Claude Design que ainda não viraram código, guardados
aqui para não se perderem num download.

O que já é código vive noutro sítio: os artboards das cinco páginas do site
estão em `src/lib/vaidesign/desenho/artboards.ts`, e as fotografias em
`public/vaidesign/`.

| Ficheiro | O que é |
|---|---|
| `Proposta.dc.html` | O modelo de proposta a enviar ao cliente quando se fecha um negócio. Quatro folhas: capa, quem somos e o pedido, prazo e valor, aceite. Os valores que lá estão são de exemplo (Padaria Central, 2026-001). |
| `Marca.dc.html` | O manual de marca: fotografia de perfil a 1080×1080 para o Instagram e para o WhatsApp, o cartão de visita digital a 390 px e o cartão físico a 85×55 mm com as medidas para a gráfica. |
| `Contacto-com-formulario.dc.html` | A página de Contacto com o formulário, em três estados — vazio, com erro e enviado — nas duas larguras. Ainda por portar. |

## A proposta

Por enquanto preenche-se à mão no Claude Design e exporta-se em PDF. O passo
seguinte, quando houver propostas que cheguem para o justificar, é gerá-la a
partir do sistema: o cliente, o modelo escolhido, o preço e o número de
proposta já estão todos na base de dados, e o número podia sair do mesmo
contador que dá os códigos de cliente (`next_client_code`).

## O cartão

O manual traz três peças e só uma é código por agora — nenhuma.

- A **fotografia de perfil** exporta-se do Claude Design e carrega-se à mão no
  Instagram e no WhatsApp.
- O **cartão físico** vai para a gráfica como está: 85 × 55 mm, 3 mm de
  sangria, texto a 4 mm do corte.
- O **cartão digital** é o que faz sentido virar página: 390 px, feito para
  abrir no telemóvel a partir de um QR. O QR do cartão impresso aponta para
  essa página, e o botão "Guardar contacto" devolve um ficheiro `.vcf` que o
  telemóvel abre na agenda. Por fazer.

O número que está no cartão — `+351 913 014 170` — é o que os botões de
WhatsApp do site usam, em `src/lib/vaidesign/agencia.ts`.
