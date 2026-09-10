/**
 * De onde vêm as imagens de uma página.
 *
 * Está num ficheiro à parte porque a escolha é feita num sítio (o formulário,
 * no browser) e obedecida noutro (a ação, no servidor). Com a lista escrita
 * duas vezes, mais dia menos dia uma delas ganhava uma opção que a outra não
 * conhecia — e o servidor calava-se e usava o valor por omissão.
 */

export const FONTES_IMAGEM = {
  google: {
    label: 'Fotografias do próprio comércio',
    explica:
      'As que estão no Google, tiradas por clientes e pelo dono. São estas que convencem — é a loja dele que aparece.',
    /** Pode gastar uma consulta paga, se ainda não se pediram as fotos. */
    custa: true,
  },
  pexels: {
    label: 'Fotografias de banco',
    explica:
      'Fotos profissionais do ramo, grátis e com licença para uso comercial. Não são da loja dele, e a página diz-o.',
    custa: false,
  },
  geradas: {
    label: 'Imagens geradas',
    explica: 'Fundos desenhados nas cores do ramo. Não são fotografias e não fingem ser.',
    custa: false,
  },
} as const;

export type FonteImagem = keyof typeof FONTES_IMAGEM;

export const FONTES_IMAGEM_IDS = Object.keys(FONTES_IMAGEM) as FonteImagem[];

export const FONTE_IMAGEM_PADRAO: FonteImagem = 'google';

export function isFonteImagem(valor: unknown): valor is FonteImagem {
  return typeof valor === 'string' && valor in FONTES_IMAGEM;
}
