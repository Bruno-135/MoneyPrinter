/**
 * Conteúdo das aulas de leitura. Cada aula é um componente com texto e
 * exemplos tocáveis (<Example>), que usam o mesmo motor da tela de estudo.
 */
import type { ReactNode } from "react";
import type { LessonSlug } from "@/lib/lessons";
import { gridScore, sustained } from "@/lib/score";
import Example from "./Example";
import HearButton from "./HearButton";
import Quiz from "./Quiz";

const P = ({ children }: { children: ReactNode }) => <p className="my-3 leading-relaxed text-zinc-300">{children}</p>;
const H = ({ children }: { children: ReactNode }) => <h2 className="mt-8 mb-2 text-lg font-semibold">{children}</h2>;
const Tip = ({ children }: { children: ReactNode }) => (
  <div className="my-4 rounded-lg border border-sky-500/30 bg-sky-500/10 px-4 py-3 text-sm text-sky-100">{children}</div>
);
const Table = ({ head, rows }: { head: string[]; rows: ReactNode[][] }) => (
  <div className="my-4 overflow-x-auto">
    <table className="w-full min-w-[480px] text-left text-sm">
      <thead className="text-xs uppercase tracking-wider text-zinc-500">
        <tr>{head.map((h) => <th key={h} className="border-b border-zinc-800 px-2 py-2 font-medium">{h}</th>)}</tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={i} className="border-b border-zinc-900">
            {r.map((c, j) => <td key={j} className="px-2 py-2 text-zinc-300">{c}</td>)}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

// ── Partituras dos exemplos ────────────────────────────────────────────────

const MAPA = gridScore("Mapa do kit: de baixo para cima", [
  { bd: "x--- ---- ---- ----", ft: "--x- ---- ---- ----", sn: "---- x--- ---- ----", t2: "---- --x- ---- ----", t1: "---- ---- x--- ----", rd: "---- ---- --x- ----", hh: "---- ---- ---- x---", cr: "---- ---- ---- --x-" },
], { bpm: 60 });

const ROCK = { hh: "x-x- x-x- x-x- x-x-", sn: "---- x--- ---- x---", bd: "x--- ---- x--- ----" };
const ROCK_SCORE = gridScore("Rock básico: mãos para cima, pé para baixo", [ROCK, ROCK], { bpm: 80 });
const CHIMBAL = gridScore("Chimbal fechado e aberto", [
  { hh: "x-x- x-x- x-x- x---", ho: "---- ---- ---- --x-", bd: "x--- ---- x--- ----", sn: "---- x--- ---- x---" },
], { bpm: 80 });

const fill = (ticks: number, res = 16) => {
  const notes: [number, number][] = [];
  for (let t = 0; t < res; t += ticks) notes.push([t, ticks]);
  return sustained("snare", notes);
};
const SEMIBREVE = gridScore("Semibreve", [fill(16), fill(16)], { bpm: 70 });
const MINIMA = gridScore("Mínimas", [fill(8), fill(8)], { bpm: 70 });
const SEMINIMA = gridScore("Semínimas", [fill(4), fill(4)], { bpm: 70 });
const COLCHEIA = gridScore("Colcheias", [fill(2), fill(2)], { bpm: 70 });
const SEMICOLCHEIA = gridScore("Semicolcheias", [fill(1), fill(1)], { bpm: 70 });
const FUSA = gridScore("Fusas", [{ events: Array.from({ length: 32 }, (_, i) => ({ tick: i, piece: "snare" as const, velocity: i % 8 === 0 ? 120 : 95 })) }], { bpm: 50, resolution: 32 });
const ESCADA = gridScore("Escada de figuras: 1, 2, 4 e 8 notas por tempo", [
  { events: [0, 8, 12, 16, 18, 20, 22, 24, 25, 26, 27, 28, 29, 30, 31].map((tick) => ({ tick, piece: "snare" as const, velocity: 100 })) },
], { bpm: 50, resolution: 32 });

const PAUSA_SEMINIMA = gridScore("Pausas de semínima", [{ sn: "x--- ---- x--- ----" }, { sn: "---- x--- ---- x---" }], { bpm: 70 });
const PAUSA_COLCHEIA = gridScore("Pausas de colcheia: notas só no \"e\"", [{ sn: "--x- --x- --x- --x-" }, { sn: "x-x- --x- x--- --x-" }], { bpm: 70 });
const PAUSA_MINIMA = gridScore("Pausa de mínima e de semibreve", [sustained("snare", [[0, 4], [4, 4]]), { events: [] }, sustained("snare", [[8, 4], [12, 4]])], { bpm: 70 });

const T34 = gridScore("3/4: três tempos por compasso", [
  { bd: "x--- ---- ----", sn: "---- x--- x---", hh: "x-x- x-x- x-x-" },
  { bd: "x--- ---- ----", sn: "---- x--- x---", hh: "x-x- x-x- x-x-" },
], { bpm: 80, timeSignature: [3, 4] });
const T24 = gridScore("2/4: dois tempos por compasso", [
  { bd: "x--- x---", sn: "---- ----", hh: "x-x- x-x-" }, { bd: "x--- ----", sn: "---- x---", hh: "x-x- x-x-" },
], { bpm: 80, timeSignature: [2, 4] });
const T68 = gridScore("6/8: duas batidas de três colcheias", [
  { hh: "xxx xxx", bd: "x-- ---", sn: "--- x--" }, { hh: "xxx xxx", bd: "x-- ---", sn: "--- x--" },
], { bpm: 50, timeSignature: [6, 8], resolution: 8 });

const COLCHETES = gridScore("Colchetes agrupam as notas de cada tempo", [{ sn: "x-x- xxxx x-xx xx-x" }], { bpm: 60 });
const PONTO = gridScore("Colcheia pontuada + semicolcheia", [{ sn: "x--x x--x x--x x---", st: "R--L R--L R--L R---" }], { bpm: 60 });
const PONTO_SEMINIMA = gridScore("Semínima pontuada + colcheia", [sustained("snare", [[0, 6], [6, 2], [8, 6], [14, 2]])], { bpm: 70 });

const ACENTOS = gridScore("Acentos", [{ sn: "Xxxx Xxxx Xxxx Xxxx", st: "RLRL RLRL RLRL RLRL" }], { bpm: 60 });
const FANTASMAS = gridScore("Notas fantasma (entre parênteses)", [{ hh: "x-x- x-x- x-x- x-x-", sn: "---g X--g -g-- X--g", bd: "x--- --x- --x- ----" }], { bpm: 70 });
const MAOS = gridScore("Paradiddle: R e L por baixo das notas", [{ sn: "Xxxx Xxxx Xxxx Xxxx", st: "RLRR LRLL RLRR LRLL" }], { bpm: 60 });

const PASSO1 = gridScore("Passo 1: só o chimbal", [{ hh: "x-x- x-x- x-x- x-x-" }], { bpm: 70 });
const PASSO2 = gridScore("Passo 2: chimbal + bumbo", [{ hh: "x-x- x-x- x-x- x-x-", bd: "x--- ---- x-x- ----" }], { bpm: 70 });
const PASSO3 = gridScore("Passo 3: tudo junto", [{ hh: "x-x- x-x- x-x- x-x-", bd: "x--- ---- x-x- ----", sn: "---- x--- ---- x---" }], { bpm: 70 });
const DESAFIO = gridScore("Desafio: leia antes de ouvir", [
  { hh: "x-x- x-x- x-x- x---", ho: "---- ---- ---- --x-", bd: "x--x --x- x--- ----", sn: "---- X--g ---- X---" },
  { hh: "x-x- x-x- x-x- ----", bd: "x--- ---- x--- ----", sn: "---- X--- ---- xxxx", st: "---- ---- ---- RLRL" },
], { bpm: 70 });

// ── Aulas ──────────────────────────────────────────────────────────────────

export const LESSON_CONTENT: Record<LessonSlug, () => ReactNode> = {
  "pauta-e-clave": () => (
    <>
      <P>
        A partitura de bateria usa a mesma <strong>pauta de 5 linhas</strong> da música, mas as linhas não são notas
        musicais (dó, ré, mi…). Cada <strong>linha ou espaço é uma peça do kit</strong>.
      </P>
      <P>
        O sinal no começo da pauta, as duas barrinhas verticais <strong>‖</strong>, é a <strong>clave de percussão</strong>:
        ela avisa que aquela pauta é de bateria.
      </P>
      <H>O mapa do kit</H>
      <P>Regra prática: <strong>os pés ficam embaixo, os pratos em cima</strong>, e os tambores no meio, do mais grave ao mais agudo.</P>
      <Table
        head={["Peça", "Onde fica na pauta", "Cabeça", ""]}
        rows={[
          ["Prato de ataque", "linha extra acima da pauta", "x", <HearButton key="c" piece="crash" />],
          ["Chimbal", "espaço logo acima da pauta", "x", <HearButton key="h" piece="hihatClosed" />],
          ["Prato de condução", "5ª linha (a de cima)", "x", <HearButton key="r" piece="ride" />],
          ["Tom 1", "4º espaço", "bolinha", <HearButton key="t1" piece="tom1" />],
          ["Tom 2", "4ª linha", "bolinha", <HearButton key="t2" piece="tom2" />],
          ["Caixa", "3º espaço (o do meio)", "bolinha", <HearButton key="s" piece="snare" />],
          ["Surdo", "2º espaço", "bolinha", <HearButton key="f" piece="floorTom" />],
          ["Bumbo", "1º espaço (embaixo)", "bolinha", <HearButton key="k" piece="kick" />],
        ]}
      />
      <P>Ouça o exemplo: cada nota é uma peça, de baixo para cima. Repare na bateria acendendo.</P>
      <Example score={MAPA} kit caption="bumbo → surdo → caixa → tom 2 → tom 1 → condução → chimbal → ataque" />
      <Tip>As linhas são contadas de baixo para cima: a 1ª linha é a de baixo. Os espaços também.</Tip>
    </>
  ),

  "cabecas-e-vozes": () => (
    <>
      <H>Bolinha ou x</H>
      <P>
        <strong>Tambores</strong> (bumbo, caixa, tons, surdo) usam a cabeça de nota normal, a <strong>bolinha</strong>.{" "}
        <strong>Pratos</strong> (chimbal, condução, ataque) usam a cabeça em <strong>x</strong>. Assim dá para
        distinguir o tipo de som num relance.
      </P>
      <H>Chimbal fechado e aberto</H>
      <P>
        O chimbal fechado é um x no espaço acima da pauta. Quando ele deve ser <strong>aberto</strong>, aparece um
        pequeno <strong>&quot;o&quot;</strong> em cima do x. A nota seguinte de chimbal (sem o &quot;o&quot;) fecha o
        chimbal de novo.
      </P>
      <Example score={CHIMBAL} kit caption="o último chimbal do compasso é aberto" />
      <H>Mãos para cima, pés para baixo</H>
      <P>
        A bateria é escrita em <strong>duas vozes</strong>: tudo o que é tocado com as <strong>mãos</strong> tem a{" "}
        <strong>haste para cima</strong>; o que é tocado com o <strong>pé</strong> (bumbo) tem a{" "}
        <strong>haste para baixo</strong>. As duas vozes acontecem ao mesmo tempo.
      </P>
      <Example score={ROCK_SCORE} kit caption="chimbal e caixa com haste para cima; bumbo com haste para baixo" />
      <Tip>Notas alinhadas na vertical tocam juntas — como o chimbal e o bumbo no início de cada compasso.</Tip>
    </>
  ),

  figuras: () => (
    <>
      <P>
        A <strong>figura</strong> diz quanto tempo vale cada nota. O tempo é a batida do metrônomo (o clique). Na
        bateria o som não fica &quot;segurando&quot; — a duração é o <strong>espaço até a próxima nota</strong>.
      </P>
      <Table
        head={["Figura", "Vale", "Por compasso de 4/4", "Como contar"]}
        rows={[
          ["Semibreve (bolinha vazia, sem haste)", "4 tempos", "1", "1 (2 3 4)"],
          ["Mínima (vazia com haste)", "2 tempos", "2", "1 (2) 3 (4)"],
          ["Semínima (cheia com haste)", "1 tempo", "4", "1 2 3 4"],
          ["Colcheia (1 bandeirola ou colchete)", "½ tempo", "8", "1 e 2 e 3 e 4 e"],
          ["Semicolcheia (2 colchetes)", "¼ de tempo", "16", "1 e & a 2 e & a…"],
          ["Fusa (3 colchetes)", "⅛ de tempo", "32", "8 notas em cada tempo"],
        ]}
      />
      <P>Cada figura vale a <strong>metade da anterior</strong>. Ouça todas no mesmo andamento:</P>
      <Example score={SEMIBREVE} caption="uma nota a cada 4 tempos" />
      <Example score={MINIMA} caption="uma nota a cada 2 tempos" />
      <Example score={SEMINIMA} caption="uma nota por tempo — junto com o clique" />
      <Example score={COLCHEIA} caption="duas notas por tempo" />
      <Example score={SEMICOLCHEIA} caption="quatro notas por tempo" />
      <Example score={FUSA} caption="oito notas por tempo (andamento mais lento)" />
      <H>Tudo num compasso</H>
      <Example score={ESCADA} caption="semínima, 2 colcheias, 4 semicolcheias, 8 fusas" />
      <Tip>Para treinar: exercício &quot;Mudança de figuras&quot; na escola (nível intermediário).</Tip>
    </>
  ),

  pausas: () => (
    <>
      <P>
        A <strong>pausa</strong> é um silêncio com duração. Cada figura tem a sua pausa, com o mesmo valor. Durante a
        pausa você <strong>continua contando</strong>, sem tocar.
      </P>
      <Table
        head={["Pausa", "Vale", "Aparência"]}
        rows={[
          ["de semibreve", "4 tempos (ou o compasso inteiro)", "retângulo pendurado na 4ª linha"],
          ["de mínima", "2 tempos", "retângulo apoiado na 3ª linha"],
          ["de semínima", "1 tempo", "um traço em zigue-zague"],
          ["de colcheia", "½ tempo", "um \"7\" com uma bolinha"],
          ["de semicolcheia", "¼ de tempo", "um \"7\" com duas bolinhas"],
        ]}
      />
      <Example score={PAUSA_SEMINIMA} caption="toca no 1 e no 3, depois no 2 e no 4" />
      <Example score={PAUSA_COLCHEIA} caption="pausa no tempo, nota no &quot;e&quot;" />
      <Example score={PAUSA_MINIMA} caption="2 notas + pausa de mínima; compasso todo em pausa; pausa de mínima + 2 notas" />
      <Tip>
        Na bateria, a voz do pé também tem pausas: quando o bumbo não toca num tempo, aparece uma pausa com a haste
        para baixo.
      </Tip>
    </>
  ),

  "compasso-e-contagem": () => (
    <>
      <H>Barras de compasso</H>
      <P>
        As linhas verticais dividem a música em <strong>compassos</strong>: grupos com o mesmo número de tempos. A barra
        dupla grossa marca o fim.
      </P>
      <H>Fórmula de compasso</H>
      <P>
        Os dois números no início (como <strong>4/4</strong>) dizem: <strong>em cima, quantos tempos</strong> tem cada
        compasso; <strong>embaixo, qual figura vale um tempo</strong> (4 = semínima, 8 = colcheia).
      </P>
      <Table
        head={["Fórmula", "Significa", "Onde aparece"]}
        rows={[
          ["4/4", "4 semínimas por compasso", "rock, pop, funk — a maioria"],
          ["3/4", "3 semínimas", "valsa, algumas baladas"],
          ["2/4", "2 semínimas", "samba, baião, marchinha"],
          ["6/8", "6 colcheias, sentidas em 2 grupos de 3", "baladas, rock lento"],
          ["12/8", "12 colcheias, em 4 grupos de 3", "blues, shuffle, jazz"],
        ]}
      />
      <Example score={T34} caption="conte &quot;1 e 2 e 3 e&quot;" />
      <Example score={T24} caption="conte &quot;1 e 2 e&quot;" />
      <Example score={T68} caption="conte &quot;1 2 3 4 5 6&quot;, com peso no 1 e no 4" />
      <H>Como contar em voz alta</H>
      <Table
        head={["Figuras", "Contagem"]}
        rows={[
          ["Semínimas", "1 · 2 · 3 · 4"],
          ["Colcheias", "1 e 2 e 3 e 4 e"],
          ["Semicolcheias", "1 e & a 2 e & a 3 e & a 4 e & a"],
          ["Tercinas (6/8, 12/8)", "1-2-3 2-2-3 3-2-3 4-2-3"],
        ]}
      />
      <Tip>Contar em voz alta parece bobo, mas é a forma mais rápida de aprender a ler. Os profissionais fazem.</Tip>
    </>
  ),

  "colchetes-e-ponto": () => (
    <>
      <H>Colchetes</H>
      <P>
        Quando há várias colcheias ou semicolcheias seguidas, em vez de bandeirolas soltas elas são ligadas por{" "}
        <strong>colchetes</strong> (as barras horizontais). Na bateria, cada grupo ligado é <strong>um tempo</strong> —
        isso ajuda a ver onde cai cada tempo.
      </P>
      <Example score={COLCHETES} caption="cada grupo ligado = 1 tempo" />
      <H>Ponto de aumento</H>
      <P>
        Um <strong>ponto</strong> depois da nota <strong>aumenta metade do valor dela</strong>. Uma colcheia pontuada vale ½
        + ¼ = ¾ de tempo; com mais uma semicolcheia, fecha o tempo. Esse &quot;tum . . ta&quot; aparece em muitos
        ritmos (samba, bossa, funk).
      </P>
      <Example score={PONTO} caption="conte &quot;1 . . a 2 . . a&quot;" />
      <Example score={PONTO_SEMINIMA} caption="semínima pontuada (1 tempo e meio) + colcheia" />
    </>
  ),

  "acentos-fantasmas-maos": () => (
    <>
      <H>Acento</H>
      <P>
        O sinal <strong>&gt;</strong> em cima da nota pede uma nota <strong>mais forte</strong> que as outras. Levante
        mais a baqueta — não aperte.
      </P>
      <Example score={ACENTOS} caption="forte no início de cada tempo" />
      <H>Nota fantasma</H>
      <P>
        Uma nota <strong>entre parênteses</strong> é uma <strong>nota fantasma</strong>: quase um toque, bem fraquinho.
        Dá o &quot;molho&quot; do funk e do R&amp;B.
      </P>
      <Example score={FANTASMAS} kit caption="caixa forte no 2 e no 4, fantasmas entre elas" />
      <H>Qual mão usar</H>
      <P>
        Embaixo das notas pode aparecer <strong>R</strong> (right, mão direita) ou <strong>L</strong> (left, mão
        esquerda). Isso se chama <em>sticking</em> e é essencial nos rudimentos.
      </P>
      <Example score={MAOS} caption="R L R R  L R L L" />
    </>
  ),

  "lendo-um-groove": () => (
    <>
      <P>Para ler um ritmo novo, não tente ler tudo de uma vez. Leia em <strong>camadas</strong>:</P>
      <ol className="my-3 list-decimal space-y-1 pl-6 text-zinc-300">
        <li>Ache a <strong>fórmula de compasso</strong> e conte um compasso em voz alta.</li>
        <li>Leia a <strong>mão direita</strong> (chimbal ou condução) — normalmente é constante.</li>
        <li>Junte o <strong>bumbo</strong> (haste para baixo) e veja onde ele cai na contagem.</li>
        <li>Junte a <strong>caixa</strong> (geralmente no 2 e no 4).</li>
        <li>Toque <strong>devagar</strong>, com loop, e só depois suba o andamento.</li>
      </ol>
      <Example score={PASSO1} kit caption="conte &quot;1 e 2 e 3 e 4 e&quot;" />
      <Example score={PASSO2} kit caption="bumbo no 1, no 3 e no &quot;e&quot; do 3" />
      <Example score={PASSO3} kit caption="caixa no 2 e no 4: pronto, é um groove de rock" />
      <H>Desafio</H>
      <P>
        Tente ler este antes de ouvir. Tem chimbal aberto, bumbo no &quot;a&quot;, acento, nota fantasma e uma pequena
        virada com as mãos indicadas.
      </P>
      <Example score={DESAFIO} kit />
    </>
  ),

  teste: () => (
    <>
      <H>Que peça é esta?</H>
      <P>Olhe a posição e a cabeça da nota. Depois de responder, você ouve o som da peça.</P>
      <Quiz kind="peca" />
      <H>Que figura é esta?</H>
      <P>Um compasso de 4/4 cheio da mesma figura. Conte quantas notas cabem.</P>
      <Quiz kind="figura" />
    </>
  ),
};
