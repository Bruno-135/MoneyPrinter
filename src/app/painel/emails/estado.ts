export interface Lote {
  vistos: number;
  comEmail: number;
  porVer: number;
  erro?: string;
}

/** O que uma ação do envio responde ao ecrã. */
export interface EstadoDeEnvio {
  ok?: boolean;
  mensagem?: string;
  /** Linhas a mostrar por baixo: os que falharam, ou os que ficaram de fora. */
  detalhes?: string[];
}

export const ENVIO_PARADO: EstadoDeEnvio = {};
