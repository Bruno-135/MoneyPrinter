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

## Estrutura

```
app/                      páginas (/, /exercicios/[id], /upload)
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
  "bpm": 90,                     // semínimas por minuto
  "timeSignature": [4, 4],
  "resolution": 16,              // grade: 16 = semicolcheias (potência de 2)
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

## Como adicionar um exercício

1. Crie `content/exercises/05-meu-groove.json` no formato acima. O nome do arquivo
   vira o endereço (`/exercicios/05-meu-groove`) e a ordem na lista é alfabética.
2. Rode `npm test` — valida todos os JSON (peças, ticks dentro do compasso,
   velocities) e verifica que a notação de cada compasso fecha.
3. `npm run dev` e abra a página. Não é preciso registrar o arquivo em lugar nenhum.

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

- **Etapa 2 — Aulas**: trilhas de exercícios por nível, texto/vídeo de explicação,
  progresso do aluno, metas de BPM, avaliação do que o aluno toca (MIDI/teclado)
  comparando com a partitura.
- **Etapa 3 — Upload de música** (`/upload`, hoje "em breve"): enviar um áudio e
  separar a bateria com **Demucs** (backend com GPU/fila), para tocar junto só com
  o resto da banda ou ouvir a bateria isolada.
- **Etapa 4 — Transcrição automática**: rodar o **ADTOF** sobre a faixa de bateria
  separada para obter onsets por peça → MIDI → `midiToScore()` (quantização na
  grade, divisão em compassos, detecção de andamento) → `DrumScore` aberto na
  mesma tela de estudo. Vai exigir suporte a quiálteras (`resolution` não-potência
  de 2) e mudanças de andamento/compasso.
