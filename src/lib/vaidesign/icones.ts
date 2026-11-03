import type { Metadata } from 'next';

/**
 * O ícone da agência: o "v" creme com a bola laranja, em fundo preto.
 *
 * O Google pede um ícone quadrado com lado múltiplo de 48 px, por isso vai o
 * de 48 e o de 192; o .ico serve os browsers antigos e o de 180 é o que o
 * iPhone usa quando alguém guarda o site no ecrã inicial.
 */
export const ICONES_DA_AGENCIA: NonNullable<Metadata['icons']> = {
  icon: [
    { url: '/vaidesign/icone/favicon.ico', sizes: '16x16 32x32 48x48' },
    { url: '/vaidesign/icone/icone-48.png', sizes: '48x48', type: 'image/png' },
    { url: '/vaidesign/icone/icone-192.png', sizes: '192x192', type: 'image/png' },
  ],
  apple: { url: '/vaidesign/icone/apple-touch-icon.png', sizes: '180x180' },
};
