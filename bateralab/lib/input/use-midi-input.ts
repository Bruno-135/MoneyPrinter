"use client";

import { useEffect, useState } from "react";
import { type DrumPiece, midiNoteToPiece } from "@/lib/score";

export type MidiStatus =
  | { kind: "unsupported" }
  | { kind: "denied" }
  | { kind: "ready"; devices: string[] };

/**
 * Bateria eletrónica via Web MIDI API (Chrome, Edge, Opera; Firefox com permissão).
 * Cada note-on com velocity > 0 é mapeado para uma peça (mapa General MIDI).
 */
export function useMidiInput(onHit: (piece: DrumPiece, velocity: number) => void): MidiStatus {
  const [status, setStatus] = useState<MidiStatus>({ kind: "unsupported" });

  useEffect(() => {
    if (typeof navigator === "undefined" || !("requestMIDIAccess" in navigator)) return;
    let access: MIDIAccess | null = null;
    let cancelled = false;

    const handle = (e: MIDIMessageEvent) => {
      const data = e.data;
      if (!data || data.length < 3) return;
      const [status, note, velocity] = [data[0]!, data[1]!, data[2]!];
      // note-on (0x9n) com velocity 0 é, por convenção, um note-off.
      if ((status & 0xf0) !== 0x90 || velocity === 0) return;
      const piece = midiNoteToPiece(note);
      if (piece) onHit(piece, velocity);
    };

    const bind = () => {
      if (!access) return;
      const names: string[] = [];
      access.inputs.forEach((input) => {
        input.onmidimessage = handle;
        names.push(input.name ?? "Dispositivo MIDI");
      });
      setStatus({ kind: "ready", devices: names });
    };

    navigator
      .requestMIDIAccess()
      .then((a) => {
        if (cancelled) return;
        access = a;
        bind();
        a.onstatechange = bind; // ligar/desligar a bateria em tempo real
      })
      .catch(() => !cancelled && setStatus({ kind: "denied" }));

    return () => {
      cancelled = true;
      if (access) {
        access.onstatechange = null;
        access.inputs.forEach((input) => (input.onmidimessage = null));
      }
    };
  }, [onHit]);

  return status;
}
