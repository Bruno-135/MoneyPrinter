# BateraLab (nome provisório)

App web de estudo de bateria. **Etapa 1:** bateria virtual que toca uma partitura
sincronizada com o áudio — sem IA ainda, mas com o formato de dados pronto para
receber partituras geradas a partir de MIDI.

> Este diretório é um projeto independente dentro do repositório (tem o seu
> próprio `package.json`). Nada aqui depende do MoneyPrinter nem do sistema de
> prospecção na raiz.

## Stack

- **Next.js 16** (App Router) + **TypeScript** + **Tailwind CSS v4**
- **Tone.js** — áudio e agendamento preciso (`Tone.Transport`)
- **VexFlow 5** — partitura de bateria
- Deploy estático na **Vercel**, sem backend

## Como rodar

```bash
cd bateralab
npm install
npm run dev          # http://localhost:3000
```

Outros comandos:

```bash
npm run build        # build de produção (gera as páginas estáticas)
npm run lint
npm run typecheck
npm test             # testes unitários (formato, MIDI, timeline, notação, exercícios)
npm run samples      # regenera public/samples/*.wav
npm run exercises    # regenera content/exercises/*.json a partir do catálogo
```

### Deploy na Vercel

Criar um projeto na Vercel apontando para este repositório com **Root Directory =
`bateralab`**. Framework: Next.js (detectado automaticamente). Não há variáveis de
ambiente.

## Como usar

- Página inicial: lista de exercícios → cada um abre a tela de estudo.
- **Tocar / Pausar / Parar**, **BPM** (40–220, pode mudar durante a reprodução),
  **Metrônomo**, **Contagem** (1 compasso antes de começar), **Loop**
  (selecione o intervalo ou clique num compasso da partitura; Shift+clique estende).
- **Peças**: desligue uma peça (ex.: bumbo) para tocá-la você. A peça silenciada continua
  a acender no kit com um contorno âmbar, indicando quando tocar.
- **Tocar você mesmo**: clique/toque nas peças, use o teclado ou uma bateria eletrônica
  USB (Web MIDI — Chrome/Edge).

| Tecla | Peça | Tecla | Peça |
|-------|------|-------|------|
| Espaço | Bumbo | U | Tom 1 |
| J | Caixa | I | Tom 2 |
| K | Chimbal fechado | O | Surdo |
| L | Chimbal aberto | Y | Prato de ataque |
| P | Prato de condução | Shift + tecla | batida forte |

O áudio só inicia depois do primeiro clique/tecla (exigência dos navegadores).

### Tocar junto (`/musica`)

Estudar uma música real por partes, com duas fontes:

- **Link do YouTube** — o vídeo toca no player oficial do YouTube (IFrame API).
  Não baixamos nem processamos o áudio: os termos do YouTube não permitem. Por
  isso, com um link dá para navegar, fazer loop e mudar a velocidade, mas **não**
  separar a bateria nem gerar partitura. Vídeos cujo dono bloqueia a incorporação
  mostram um aviso.
- **Arquivo** (MP3, WAV, M4A, OGG, FLAC) — tocado no navegador, nunca enviado a
  servidor, com forma de onda na linha do tempo. É por aqui que vai entrar a
  separação da bateria (botão "Separar bateria — em breve").

Controles: tocar/pausar, ±5 s, clique/arraste na linha do tempo, **loop A–B**
(marcar A e B, ajuste fino de ±0,1 s, ou Shift+arrastar na linha do tempo),
**velocidade** sem mudar o tom (YouTube: 25–200% nos passos do player; arquivo:
25–150% em passos de 5%) e **marcações** com nome (clique para ir; "loop" faz
loop até a marcação seguinte). Loop, velocidade e marcações ficam guardados no
navegador (localStorage) para cada música, e os links recentes aparecem na lista.

Atalhos: Espaço tocar/pausar · ←/→ ±5 s · `[` marca A · `]` marca B · `L` loop ·
`M` marcação · `−`/`=` velocidade · Home volta ao início (do loop).

Precisão do loop no YouTube: o iframe só informa a posição de tempos em tempos,
por isso a posição é extrapolada com o relógio local enquanto toca
(`lib/practice/youtube.ts`), evitando que o loop passe muito do ponto B.

## Estrutura

```
app/                      páginas (/, /exercicios/[id], /musica; /upload redireciona)
components/
  DrumKit.tsx             kit em SVG visto de cima, acende as peças
  ScoreView.tsx           partitura VexFlow + cursor + rolagem automática
  Transport.tsx           play/pause/stop, BPM, metrônomo, contagem, loop
  PieceToggles.tsx        silenciar peças individualmente
  StudyScreen.tsx         junta tudo (teclado, MIDI, layout responsivo)
lib/score/                formato DrumScore, validação, MIDI, notação
lib/audio/
  timeline.ts             DrumScore → ticks do Transport (função pura)
  engine.ts               motor Tone.js (agendamento, sincronia, loop, contagem)
  kit.ts                  vozes: samples WAV ou síntese (fallback)
lib/input/                atalhos de teclado e Web MIDI
lib/practice/             tocar junto: player YouTube, arquivo local, forma de onda, preferências
components/practice/      tela Tocar junto (linha do tempo, loop A–B, velocidade, marcações)
content/exercises/        exercícios em JSON (formato DrumScore)
public/samples/           samples WAV do kit
scripts/generate-samples.mjs   gerador dos samples
```

## O formato `DrumScore`

Definido em [`lib/score/types.ts`](lib/score/types.ts). É o centro do app: áudio,
partitura, kit e (no futuro) a transcrição falam todos este formato.

```jsonc
{
  "id": "01-rock-basico",
  "title": "Rock básico",
  "description": "Texto opcional mostrado na lista",
  "bpm": 90,                     // batidas por minuto (semínima; pontuada em 6/8 e 12/8)
  "timeSignature": [4, 4],
  "resolution": 16,              // grade: 16 = semicolcheias (potência de 2)
  "level": "iniciante",          // opcionais: level, category, style, tips, goalBpm
  "measures": [
    { "events": [
      { "tick": 0, "piece": "kick",        "velocity": 110 },
      { "tick": 0, "piece": "hihatClosed", "velocity": 100 },
      { "tick": 4, "piece": "snare",       "velocity": 110 }
    ] }
  ]
}
```

- `tick` é a posição **dentro do compasso** em unidades de `resolution`. Em 4/4 com
  resolution 16: tempo 1 = 0, tempo 2 = 4, tempo 3 = 8, tempo 4 = 12; o "e" do 1 = 2.
- `piece`: `kick`, `snare`, `hihatClosed`, `hihatOpen`, `tom1`, `tom2`, `floorTom`,
  `crash`, `ride`.
- `velocity`: 1–127 (≥ 118 e acima da média do compasso aparece com acento).

Mapa General MIDI (canal 10) em [`lib/score/midi.ts`](lib/score/midi.ts):
kick 36, snare 38, hihatClosed 42, hihatOpen 46, tom1 48, tom2 45, floorTom 43,
crash 49, ride 51 (variantes GM comuns como 35, 40, 44, 57… também são aceitas
na entrada). `scoreToMidi()` exporta um `.mid` (formato 0); `midiToScore()` é
um stub com o plano da etapa 4 em TODO.

## Escola: banco de ritmos

A página inicial é o catálogo da escola: **36 exercícios** em três níveis
(Iniciante, Intermediário, Avançado) e quatro tipos (Ritmos, Rudimentos,
Viradas, Leitura e coordenação), com filtro por estilo. Cada exercício tem
andamento inicial, meta de BPM e dicas de estudo.

Estilos incluídos: rock, pop, funk, disco, samba, baião, bossa nova, reggae,
blues (shuffle), balada 6/8, jazz, metal, drum and bass e 5/4. Rudimentos:
toque simples, toque duplo, paradiddle, duplo paradiddle, paradiddle-diddle e
acentos. Viradas de 1 tempo, pelos tons, 3-3-2, em tercinas e linear com bumbo.

Na partitura: acento (`>`) para notas fortes, **notas fantasma entre
parênteses** e **mãos (R/L)** por baixo das notas quando indicadas. Em 6/8 e
12/8 o BPM e o metrônomo contam semínimas pontuadas.

## Como adicionar um exercício

**Pelo catálogo (recomendado).** Acrescente um objeto em
[`scripts/exercise-catalog.mjs`](scripts/exercise-catalog.mjs) e rode
`npm run exercises`, que regenera `content/exercises/*.json`. Cada compasso é
escrito como linhas de grade, um caractere por tick:

```js
{
  id: "meu-groove",                 // vira /exercicios/meu-groove
  title: "Meu groove",
  level: "iniciante",               // iniciante | intermediario | avancado
  category: "groove",               // groove | rudimento | virada | leitura
  style: "Rock",
  description: "…",
  tips: ["…"],
  bpm: 80, goalBpm: 120,
  timeSignature: [4, 4], resolution: 16,
  bars: [{
    hh: "x-x- x-x- x-x- x-x-",       // 1 e & a | 2 e & a | …
    sn: "---- X--- ---- X---",       // X = acento, g = fantasma
    bd: "x--- ---- x--- ----",
  }],
}
```

Linhas: `hh` chimbal fechado, `ho` aberto, `sn` caixa, `bd` bumbo, `t1`, `t2`,
`ft` surdo, `cr` ataque, `rd` condução e `st` (opcional): a mão de cada tick, `R`, `L` ou `-`, aplicada às notas das mãos nesse tick.

**Ou à mão.** Crie um `.json` no formato `DrumScore` em `content/exercises/`
(arquivos sem `"generated": true` não são apagados pelo gerador).

Depois rode `npm test`: valida todos os exercícios, confere que a notação de
cada compasso fecha e que nenhum momento pede mais de duas mãos.

## Sincronia (como funciona)

Comentado em detalhe em [`lib/audio/engine.ts`](lib/audio/engine.ts) e
[`lib/audio/timeline.ts`](lib/audio/timeline.ts). Em resumo:

1. Todas as notas e batidas do metrônomo são agendadas no `Tone.Transport` em
   **ticks** (192 por semínima), nunca em segundos. Mudar o BPM reescala o tempo
   sem desalinhar nada.
2. O som é agendado no `time` exato do AudioContext que o Transport fornece
   (precisão de amostra, imune a travamentos do JavaScript).
3. A parte visual (cursor da partitura, peças acesas) é disparada por
   `Tone.Draw.schedule(fn, time)`, que corre no frame de animação em que o áudio
   chega a `time`. Os componentes alteram classes CSS diretamente, sem re-render React.
4. Loop = `Transport.loop` com `loopStart`/`loopEnd` em ticks. A contagem usa o
   compasso imediatamente anterior ao início, silenciando as notas desse compasso.

### Testar a sincronia

Abra uma página de exercício com `?debug=sync` (ex.:
`/exercicios/01-rock-basico?debug=sync`). O motor fica em `window.__bateralab` e
`window.__bateralab.debugSync` acumula, para cada nota e batida, o instante agendado
do som (`audioTime`) e o instante em que a parte visual executou (`drawTime`).

Resultado medido no Chromium (headless) durante o desenvolvimento:

| Cenário | Passos | Som e partitura no mesmo `audioTime` | Atraso visual (mediana / máx.) | Erro no intervalo entre batidas |
|---|---|---|---|---|
| 60 BPM, rock básico, com contagem | 10 | 10/10 | 0,9 ms / 1,5 ms | 0,000 ms |
| 180 BPM, semicolcheias, com contagem (até o fim) | 64 | 64/64 | 3,5 ms / 12,2 ms | 0,000 ms |
| 60 → 180 BPM durante a reprodução | 32 | 32/32 | 6,9 ms / 12,2 ms | 0,000 ms (antes e depois) |

Também verificado: loop num compasso (só esse compasso toca, contagem silenciada),
bumbo silenciado (0 bumbos tocados, peça continua acendendo), pausa/retomada e fim
automático da partitura sem loop.

## Origem dos sons

Os samples em `public/samples/*.wav` são **gerados por síntese** pelo script
[`scripts/generate-samples.mjs`](scripts/generate-samples.mjs) (osciladores, ruído e
filtros simples, sem gravações de terceiros) — não há licença externa envolvida.
Para usar um kit gravado (ex.: um kit CC0), substitua os arquivos mantendo os nomes
(`kick.wav`, `snare.wav`, `hihatClosed.wav`, …) e documente a origem aqui.

Se os samples não carregarem, o app usa automaticamente um **kit sintetizado em
tempo real** com Tone.js: `MembraneSynth` (bumbo e tons), `NoiseSynth` (caixa) e
`MetalSynth` (pratos e chimbal). Nos dois casos, o chimbal fechado corta o aberto.

## Próximas etapas

- **Etapa 2 — Aulas**: o banco de ritmos já existe; faltam trilhas guiadas,
  texto/vídeo de explicação, progresso do aluno (contas, banco de dados) e
  avaliação do que o aluno toca (MIDI/teclado) comparando com a partitura.
- **Etapa 3 — Separar a bateria**: o player de arquivo já existe (`/musica`, aba
  Arquivo); falta enviar o áudio a um backend com GPU (ex.: **Demucs** no Replicate)
  para tocar junto só com o resto da banda ou ouvir a bateria isolada.
- **Etapa 4 — Transcrição automática**: rodar o **ADTOF** sobre a faixa de bateria
  separada para obter onsets por peça → MIDI → `midiToScore()` (quantização na
  grade, divisão em compassos, detecção de andamento) → `DrumScore` aberto na
  mesma tela de estudo. Vai exigir suporte a quiálteras (`resolution` não-potência
  de 2) e mudanças de andamento/compasso.
