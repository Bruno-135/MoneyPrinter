# Pedido para o Claude Design — Assinatura de email da VaiDesign

Copiar o que está entre as linhas e colar no Claude Design.

**Antes de pedir, saber isto:** uma assinatura de email não é uma página web.
O Gmail e o Outlook deitam fora flexbox, grid, SVG e fontes do Google. Sem as
regras técnicas abaixo, sai uma coisa bonita no ecrã do Claude Design que se
desfaz na caixa do cliente.

**Depois de ter o HTML:** não se cola o código. Abre-se o HTML num navegador,
selecciona-se o resultado desenhado com o rato, copia-se, e cola-se na caixa
da assinatura em Gmail → Configurações → Geral → Assinatura.

---

Faz a assinatura de email da minha agência, a VaiDesign.

IMPORTANTE — isto não é uma página web, é HTML de email. Vai ser colado no
Gmail e lido no Outlook, no Apple Mail e no telemóvel. Por isso:

- Só tabelas (<table>, <tr>, <td>) para a estrutura. Nada de flexbox, grid,
  position, float ou margin negativa.
- Todos os estilos em linha, no atributo style de cada elemento. Nada de
  <style> nem de classes.
- Sem imagens, sem SVG, sem ícones de fonte. Tudo em texto e cor.
- Sem fontes do Google. Usa esta pilha, que existe em toda a parte:
  font-family: 'Barlow Condensed', 'Arial Narrow', Arial, sans-serif
  para o logótipo, e
  font-family: -apple-system, 'Segoe UI', Roboto, Arial, sans-serif
  para o resto.
- Largura máxima 460px. Tem de se ler num telemóvel sem esticar.
- Devolve-me o HTML em bruto, para eu copiar.

A marca:
- Preto do texto #141210
- Cinzento do texto secundário #5A5249
- Laranja da marca #EC5B13
- Laranja dos links #BA4100
- Linha separadora #DDD2C0

O logótipo é a palavra «vaı» (sem pinto no i) em maiúsculas, peso 800, colada
(letter-spacing -0.02em), com um ponto redondo laranja a seguir — usa o
carácter • em #EC5B13, não uma imagem. Ao lado, mais pequena, a palavra
DESIGN espaçada (letter-spacing 0.3em) em #5A5249.

O conteúdo, por esta ordem:

  VAI• DESIGN
  ─────────────────────
  Bruno Dias
  Sites e marketing para quem vive do seu negócio

  WhatsApp +351 913 014 170
  geral@vaidesign.net
  vaidesign.net
  @agenciavaidesign

O WhatsApp é link para https://wa.me/351913014170
O email é link para mailto:geral@vaidesign.net
O site é link para https://vaidesign.net
O Instagram é link para https://instagram.com/agenciavaidesign

Os links em #BA4100, sem sublinhado, em negrito leve (600).
Uma linha fina #DDD2C0 a separar o logótipo do resto.
Muito ar entre as linhas. Nada de molduras à volta de tudo.

Faz-me duas versões:

1. COMPLETA — tudo o que está acima. É para mensagens novas.
2. CURTA — só o logótipo, o nome e o WhatsApp, em duas linhas. É para
   respostas, onde uma assinatura grande repetida em cada mensagem cansa.
