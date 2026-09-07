/**
 * Constantes das fotografias das landing pages.
 *
 * Ficheiro à parte porque o nome do balde e o formato dos caminhos são
 * partilhados por três sítios que não se podem importar uns aos outros: o
 * componente de carregamento (browser), a ação de remoção (servidor) e a
 * política de segurança na base de dados (migração 0011). Um nome escrito à
 * mão em cada um deles é um erro à espera de acontecer.
 */

export const PHOTO_BUCKET = 'fotos-sites';

/**
 * Lado maior da imagem depois de redimensionada, em píxeis.
 *
 * 1600 chega para ocupar a largura de um ecrã grande sem se ver granulado, e
 * traz uma fotografia de telemóvel de 4 MB para uns 300 kB. O limite do balde
 * são 5 MB; sem redimensionar, metade das fotos tiradas com telemóvel seriam
 * recusadas.
 */
export const PHOTO_MAX_EDGE = 1600;

/** Qualidade do JPEG. 0,82 é o ponto onde o ficheiro encolhe sem se notar. */
export const PHOTO_QUALITY = 0.82;

/**
 * Caminho do ficheiro no armazenamento.
 *
 * A primeira pasta é o dono, e isso não é arrumação: é o que permite à política
 * de segurança decidir quem pode escrever, comparando o primeiro segmento com
 * quem está autenticado. Mudar esta forma sem mudar a migração 0011 deixa
 * qualquer pessoa escrever na pasta de qualquer outra.
 */
export function photoPath(ownerId: string, siteId: string, fileName: string): string {
  return `${ownerId}/${siteId}/${fileName}`;
}
