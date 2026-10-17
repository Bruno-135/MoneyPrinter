"use client";

/**
 * Testes das aulas: "que peça é esta?" e "que figura é esta?".
 * Cada pergunta mostra uma partitura de um compasso; a resposta toca o som.
 */
import { useMemo, useState } from "react";
import ScoreView from "@/components/ScoreView";
import { getEngine } from "@/lib/audio/engine";
import { PIECE_LABEL } from "@/lib/input/keymap";
import { DRUM_PIECES, type DrumPiece, type DrumScore, sustained } from "@/lib/score";

const NO_LOOP = { enabled: false, start: 0, end: 0 };

interface Question {
  score: DrumScore;
  answer: string;
  options: string[];
  piece?: DrumPiece;
  explain: string;
}

const FIGURES = [
  { name: "Semibreve", ticks: 16, explain: "dura 4 tempos — o compasso inteiro em 4/4" },
  { name: "Mínima", ticks: 8, explain: "dura 2 tempos" },
  { name: "Semínima", ticks: 4, explain: "dura 1 tempo" },
  { name: "Colcheia", ticks: 2, explain: "dura meio tempo (2 por tempo) — tem uma bandeirola ou um colchete" },
  { name: "Semicolcheia", ticks: 1, explain: "dura ¼ de tempo (4 por tempo) — dois colchetes" },
];

function shuffle<T>(list: T[]): T[] {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

function pieceQuestion(n: number): Question {
  const piece = DRUM_PIECES[Math.floor(Math.random() * DRUM_PIECES.length)]!;
  const score: DrumScore = {
    id: `quiz-peca-${n}`,
    title: "Que peça é esta?",
    bpm: 80,
    timeSignature: [4, 4],
    resolution: 16,
    measures: [{ events: [0, 4, 8, 12].map((tick) => ({ tick, piece, velocity: 100 })) }],
  };
  const others = shuffle(DRUM_PIECES.filter((p) => p !== piece)).slice(0, 3);
  return {
    score,
    piece,
    answer: PIECE_LABEL[piece],
    options: shuffle([piece, ...others]).map((p) => PIECE_LABEL[p]),
    explain: explainPiece(piece),
  };
}

function explainPiece(piece: DrumPiece): string {
  const where: Record<DrumPiece, string> = {
    kick: "1º espaço (embaixo), haste para baixo: é tocado com o pé",
    floorTom: "2º espaço, cabeça redonda",
    snare: "3º espaço, cabeça redonda",
    tom2: "4ª linha, cabeça redonda",
    tom1: "4º espaço, cabeça redonda",
    ride: "5ª linha (a de cima), cabeça em x",
    hihatClosed: "espaço acima da pauta, cabeça em x",
    hihatOpen: "espaço acima da pauta, cabeça em x com um \"o\" em cima",
    crash: "linha suplementar acima da pauta, cabeça em x",
  };
  return where[piece];
}

function figureQuestion(n: number): Question {
  const fig = FIGURES[Math.floor(Math.random() * FIGURES.length)]!;
  const notes: [number, number][] = [];
  for (let t = 0; t < 16; t += fig.ticks) notes.push([t, fig.ticks]);
  const score: DrumScore = {
    id: `quiz-figura-${n}`,
    title: "Que figura é esta?",
    bpm: 70,
    timeSignature: [4, 4],
    resolution: 16,
    measures: [sustained("snare", notes)],
  };
  return {
    score,
    answer: fig.name,
    options: shuffle(FIGURES.map((f) => f.name)),
    explain: `${fig.name} ${fig.explain}.`,
  };
}

export default function Quiz({ kind, total = 8 }: { kind: "peca" | "figura"; total?: number }) {
  const make = kind === "peca" ? pieceQuestion : figureQuestion;
  const [round, setRound] = useState(0);
  const [question, setQuestion] = useState<Question | null>(null);
  const [picked, setPicked] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const engine = useMemo(() => getEngine(), []);

  const start = () => {
    setRound(1);
    setScore(0);
    setPicked(null);
    setQuestion(make(1));
  };

  if (!question) {
    return (
      <button type="button" onClick={start} className="rounded-lg bg-sky-500 px-4 py-2 text-sm font-medium text-zinc-950 hover:bg-sky-400">
        Começar o teste ({total} perguntas)
      </button>
    );
  }

  const finished = round > total;
  if (finished) {
    return (
      <div className="flex flex-col items-start gap-3 rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
        <p className="text-lg font-semibold">
          Você acertou {score} de {total}.
        </p>
        <p className="text-sm text-zinc-400">
          {score === total ? "Perfeito! Pode seguir para os exercícios de leitura." : "Releia a aula e tente de novo — cada rodada tem perguntas diferentes."}
        </p>
        <button type="button" onClick={start} className="rounded-lg border border-zinc-700 px-4 py-2 text-sm hover:bg-zinc-800">
          Fazer de novo
        </button>
      </div>
    );
  }

  const answer = (option: string) => {
    if (picked) return;
    setPicked(option);
    if (option === question.answer) setScore((s) => s + 1);
    if (question.piece) void engine.hit(question.piece);
  };

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
      <p className="text-sm text-zinc-400">
        Pergunta {round} de {total} · {score} acertos
      </p>
      <p className="font-semibold">{question.score.title}</p>
      <div className="max-w-md">
        <ScoreView key={question.score.id} score={question.score} engine={engine} loop={NO_LOOP} compact />
      </div>
      <div className="grid grid-cols-2 gap-2 sm:max-w-md">
        {question.options.map((o) => {
          const isAnswer = o === question.answer;
          const state = !picked ? "" : isAnswer ? "border-emerald-500 bg-emerald-500/15 text-emerald-200" : o === picked ? "border-red-500 bg-red-500/15 text-red-200" : "opacity-50";
          return (
            <button key={o} type="button" disabled={!!picked} onClick={() => answer(o)} className={`rounded-lg border border-zinc-700 px-3 py-2 text-sm hover:bg-zinc-800 ${state}`}>
              {o}
            </button>
          );
        })}
      </div>
      {picked && (
        <div className="flex flex-col items-start gap-2">
          <p className="text-sm text-zinc-300">
            {picked === question.answer ? "✓ Certo! " : `✗ Era ${question.answer}: `}
            {question.explain}
          </p>
          <button
            type="button"
            onClick={() => {
              const next = round + 1;
              setRound(next);
              setPicked(null);
              if (next <= total) setQuestion(make(next));
            }}
            className="rounded-lg bg-sky-500 px-4 py-2 text-sm font-medium text-zinc-950 hover:bg-sky-400"
          >
            {round === total ? "Ver resultado" : "Próxima"}
          </button>
        </div>
      )}
    </div>
  );
}
