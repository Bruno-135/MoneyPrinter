'use client';

import { useState, type ReactNode } from 'react';

/**
 * A foto de um cartão, ou o lugar vazio se ela não abrir.
 *
 * O endereço que a Google dá a uma foto EXPIRA. Um cartão com um endereço
 * guardado há semanas mostrava o ícone de imagem partida (um «?» no Safari);
 * agora, se a imagem falhar, fica o mesmo fundo dos cartões sem foto. O
 * «Carregar fotos» renova os endereços antigos.
 */
export function FotoDoCartao({ url, children }: { url: string; children: ReactNode }) {
  const [partida, setPartida] = useState(false);
  if (partida) return <>{children}</>;
  return (
    // eslint-disable-next-line @next/next/no-img-element -- endereço do Google, já pago e com validade; o otimizador do Next voltava a pedi-lo.
    <img
      src={url}
      alt=""
      className="h-full w-full object-cover"
      loading="lazy"
      // A imagem pode falhar ANTES de o React ligar o onError (a página vem
      // desenhada do servidor). Nesse caso já está «completa» e sem largura.
      ref={(img) => {
        if (img?.complete && img.naturalWidth === 0) setPartida(true);
      }}
      onError={() => setPartida(true)}
    />
  );
}
