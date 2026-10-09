import type { DrumPiece } from "@/lib/score";

/** Atalhos de teclado (KeyboardEvent.code → peça). Layout pensado para as duas mãos. */
export const KEY_TO_PIECE: Record<string, DrumPiece> = {
  Space: "kick",
  KeyJ: "snare",
  KeyK: "hihatClosed",
  KeyL: "hihatOpen",
  KeyU: "tom1",
  KeyI: "tom2",
  KeyO: "floorTom",
  KeyY: "crash",
  KeyP: "ride",
};

export const PIECE_KEY_LABEL: Record<DrumPiece, string> = {
  kick: "Espaço",
  snare: "J",
  hihatClosed: "K",
  hihatOpen: "L",
  tom1: "U",
  tom2: "I",
  floorTom: "O",
  crash: "Y",
  ride: "P",
};

export const PIECE_LABEL: Record<DrumPiece, string> = {
  kick: "Bumbo",
  snare: "Caixa",
  hihatClosed: "Chimbal fechado",
  hihatOpen: "Chimbal aberto",
  tom1: "Tom 1",
  tom2: "Tom 2",
  floorTom: "Surdo",
  crash: "Ataque",
  ride: "Condução",
};
