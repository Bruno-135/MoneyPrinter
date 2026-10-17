/**
 * Preferências de estudo por música (loop, velocidade, marcações), guardadas
 * no localStorage do navegador. Nada vai para servidor.
 */

export interface Marker {
  id: string;
  time: number;
  label: string;
}

export interface PracticeState {
  a: number | null;
  b: number | null;
  loop: boolean;
  rate: number;
  markers: Marker[];
}

export interface RecentSource {
  key: string;
  title: string;
  /** Para YouTube: o link; para arquivo: o nome. */
  ref: string;
  kind: "youtube" | "file";
  at: number;
}

const PREFIX = "bateralab:practice:";
const RECENT = "bateralab:recent";

export const emptyState = (): PracticeState => ({ a: null, b: null, loop: false, rate: 1, markers: [] });

function read<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function write(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // modo privado ou armazenamento cheio: segue sem guardar
  }
}

export function loadPractice(sourceKey: string): PracticeState {
  return { ...emptyState(), ...read<Partial<PracticeState>>(PREFIX + sourceKey) };
}

export function savePractice(sourceKey: string, state: PracticeState) {
  write(PREFIX + sourceKey, state);
}

export function listRecent(): RecentSource[] {
  return read<RecentSource[]>(RECENT) ?? [];
}

export function pushRecent(entry: Omit<RecentSource, "at">) {
  const list = listRecent().filter((r) => r.key !== entry.key);
  list.unshift({ ...entry, at: Date.now() });
  write(RECENT, list.slice(0, 8));
}
