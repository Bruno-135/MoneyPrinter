'use client';

import { useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { PHOTO_BUCKET, PHOTO_MAX_EDGE, PHOTO_QUALITY, photoPath } from '@/lib/sites/photos';

/**
 * As fotografias de uma peça, carregadas do telemóvel.
 *
 * Antes isto era uma caixa de texto onde se colavam endereços, e era pedir a
 * alguém que fotografa a peça na loja que fosse primeiro arranjar um sítio na
 * internet onde a pendurar. Não servia.
 *
 * O ficheiro vai do browser direto para o armazenamento, sem passar pelo
 * servidor: uma foto de telemóvel tem vários megabytes, e a Vercel recusa
 * pedidos desse tamanho — falhariam exactamente as fotos tiradas na loja, que
 * são as que interessam. É a mesma mecânica do editor da página, e o
 * redimensionamento aqui é o que traz 4 MB para uns 300 kB.
 */

interface Props {
  siteId: string;
  ownerId: string;
  iniciais: readonly string[];
}

async function encolher(ficheiro: File): Promise<Blob> {
  const bitmap = await createImageBitmap(ficheiro);

  const escala = Math.min(1, PHOTO_MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const largura = Math.round(bitmap.width * escala);
  const altura = Math.round(bitmap.height * escala);

  const tela = document.createElement('canvas');
  tela.width = largura;
  tela.height = altura;

  const contexto = tela.getContext('2d');
  if (!contexto) throw new Error('O browser não conseguiu processar a imagem.');

  contexto.drawImage(bitmap, 0, 0, largura, altura);
  bitmap.close();

  const blob = await new Promise<Blob | null>((resolve) =>
    tela.toBlob(resolve, 'image/jpeg', PHOTO_QUALITY),
  );
  if (!blob) throw new Error('O browser não conseguiu processar a imagem.');
  return blob;
}

/** Quantas fotos uma peça leva. A ficha do desenho pede quatro; oito é folga. */
const MAXIMO = 8;

export function FotosDaPeca({ siteId, ownerId, iniciais }: Props) {
  const entrada = useRef<HTMLInputElement>(null);
  const [urls, setUrls] = useState<string[]>([...iniciais]);
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function carregar(ficheiros: FileList) {
    setOcupado(true);
    setErro(null);

    try {
      const supabase = createClient();
      const novos: string[] = [];

      // Uma a uma e não em paralelo: num 4G fraco, quatro envios ao mesmo
      // tempo dividem a ligação e falham todos a meio.
      for (const ficheiro of Array.from(ficheiros).slice(0, MAXIMO - urls.length)) {
        const blob = await encolher(ficheiro);
        const caminho = photoPath(ownerId, siteId, `${crypto.randomUUID()}.jpg`);

        const { error } = await supabase.storage
          .from(PHOTO_BUCKET)
          .upload(caminho, blob, { contentType: 'image/jpeg', upsert: false });
        if (error) throw new Error(error.message);

        const {
          data: { publicUrl },
        } = supabase.storage.from(PHOTO_BUCKET).getPublicUrl(caminho);
        novos.push(publicUrl);
      }

      setUrls((atuais) => [...atuais, ...novos].slice(0, MAXIMO));
    } catch (causa) {
      setErro(causa instanceof Error ? causa.message : 'Não foi possível carregar a fotografia.');
    } finally {
      setOcupado(false);
      if (entrada.current) entrada.current.value = '';
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-medium">Fotografias</span>

      {/* O que vai no formulário. O que se vê são as miniaturas. */}
      <input type="hidden" name="fotos" value={urls.join('\n')} />

      {urls.length > 0 && (
        <ul className="flex flex-wrap gap-2">
          {urls.map((url, i) => (
            <li key={url} className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={url}
                alt={i === 0 ? 'Fotografia principal' : `Fotografia ${i + 1}`}
                className="h-24 w-20 rounded-md border border-line object-cover"
              />
              {i === 0 && (
                <span className="absolute bottom-1 left-1 rounded bg-black/70 px-1 text-[10px] text-white">
                  grelha
                </span>
              )}
              <button
                type="button"
                onClick={() => setUrls((a) => a.filter((u) => u !== url))}
                aria-label="Tirar esta fotografia"
                className="absolute -top-2 -right-2 h-6 w-6 rounded-full border border-line bg-surf text-sm leading-none"
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}

      <input
        ref={entrada}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        disabled={ocupado || urls.length >= MAXIMO}
        onChange={(e) => {
          if (e.target.files?.length) void carregar(e.target.files);
        }}
        className="hidden"
        id={`fotos-${siteId}-${iniciais.length}`}
      />
      <label
        htmlFor={`fotos-${siteId}-${iniciais.length}`}
        className={`cursor-pointer self-start rounded-md border border-line px-3 py-2 text-sm font-medium ${
          ocupado || urls.length >= MAXIMO ? 'opacity-50' : 'hover:border-brand-500'
        }`}
      >
        {ocupado
          ? 'A carregar…'
          : urls.length >= MAXIMO
            ? `Já tens ${MAXIMO} fotografias`
            : urls.length === 0
              ? 'Escolher fotografias'
              : 'Acrescentar mais'}
      </label>

      <span className="text-xs text-ink3">
        Tira com o telemóvel ou escolhe da galeria. A primeira é a que aparece na grelha — arrasta
        não dá, mas podes tirar e voltar a pôr pela ordem que quiseres.
      </span>

      {erro && <p className="text-sm text-red-600 dark:text-red-400">{erro}</p>}
    </div>
  );
}
