import type { Metadata } from 'next';
import Image from 'next/image';
import { FAMILIAS, pecasPorFazer, pecasProntas, type Peca } from '@/lib/vaidesign/marca/pecas';

/**
 * A sala da marca: tudo o que se manda a um cliente ou se põe numa rede.
 *
 * Desenha-se a partir da lista em `lib/vaidesign/marca/pecas.ts`, e nunca a
 * partir de botões escritos aqui à mão. A diferença é que assim não existe a
 * possibilidade de um botão prometer um ficheiro que não está lá — e neste
 * projecto já aconteceu duas vezes um botão não fazer o que dizia.
 *
 * As peças que faltam aparecem na mesma, apagadas e sem botão, com o que é
 * preciso para as ter. Esconder o que falta faz-nos procurar duas vezes.
 */

export const metadata: Metadata = {
  title: 'Marca — VaiDesign',
};

function Cartao({ peca }: { peca: Peca }) {
  const porFazer = !peca.ficheiro;

  return (
    <div
      className={`border-line bg-surf2 flex flex-col overflow-hidden rounded-2xl border ${
        porFazer ? 'opacity-60' : ''
      }`}
    >
      {peca.formato === 'png' && peca.ficheiro && (
        /* A pré-visualização sobre xadrez claro: várias destas peças são
           escuras, e uma imagem escura sobre um cartão escuro não se vê. */
        <div className="flex items-center justify-center bg-[#E8E2D8] p-4">
          <Image
            src={peca.ficheiro}
            alt={peca.nome}
            width={320}
            height={210}
            className="h-auto max-h-40 w-auto max-w-full rounded-lg"
            unoptimized
          />
        </div>
      )}

      <div className="flex flex-1 flex-col gap-1 p-4">
        <div className="text-[14px] font-bold">{peca.nome}</div>
        <div className="text-ink3 text-[12px] leading-relaxed">{peca.para}</div>

        {peca.medidas && (
          <div className="text-ink3 pt-0.5 font-mono text-[11px]">{peca.medidas}</div>
        )}

        {porFazer ? (
          <div className="border-line text-ink3 mt-2 rounded-lg border border-dashed p-2 text-[11px] leading-relaxed">
            <span className="text-warm font-semibold">Falta fazer. </span>
            {peca.porFazer}
          </div>
        ) : (
          <div className="mt-3 flex gap-2">
            <a
              href={peca.ficheiro}
              target="_blank"
              rel="noreferrer"
              className="border-line bg-surf hover:border-marca flex h-9 flex-1 items-center justify-center rounded-lg border text-[12px] font-semibold"
            >
              Abrir
            </a>
            {peca.formato === 'png' && (
              <a
                href={peca.ficheiro}
                download
                className="bg-marca flex h-9 flex-1 items-center justify-center rounded-lg text-[12px] font-semibold text-[#141210]"
              >
                Descarregar
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function MarcaPage() {
  const prontas = pecasProntas().length;
  const faltam = pecasPorFazer().length;

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h1 className="text-[20px] font-bold">Marca</h1>
        <span className="text-ink3 font-mono text-[12px]">
          {prontas} prontas · {faltam} por fazer
        </span>
      </div>

      {FAMILIAS.map((familia) => (
        <section key={familia.titulo} className="flex flex-col gap-3">
          <div>
            <h2 className="text-[15px] font-semibold">{familia.titulo}</h2>
            <p className="text-ink3 text-[12px] leading-relaxed">{familia.nota}</p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {familia.pecas.map((p) => (
              <Cartao key={p.id} peca={p} />
            ))}
          </div>
        </section>
      ))}

      <p className="text-ink3 border-line border-t pt-4 text-[12px] leading-relaxed">
        Os dois documentos abrem no browser e imprimem-se para PDF com Ctrl+P — cada folha sai numa
        página A4. Não precisam de internet depois de abertos.
      </p>
    </div>
  );
}
