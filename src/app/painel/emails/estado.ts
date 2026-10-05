export interface Lote {
  /** Quantos sites se viram neste lote. */
  vistos: number;
  /** Destes, quantos tinham e-mail. */
  comEmail: number;
  /** Quantos continuam por extrair depois deste lote; -1 se deu erro. */
  porExtrair: number;
  erro?: string;
}
