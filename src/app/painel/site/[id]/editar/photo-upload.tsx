'use client';

import { useRef, useState, useTransition } from 'react';
import { createClient } from '@/lib/supabase/client';
import { PHOTO_BUCKET, PHOTO_MAX_EDGE, PHOTO_QUALITY, photoPath } from '@/lib/sites/photos';
import { attachPhoto } from '../../site-edit-actions';

/**
 * Carregamento de uma fotografia.
 *
 * O ficheiro vai do browser direto para o armazenamento do Supabase, sem passar
 * pelo servidor da aplicação. Duas razões: uma foto de telemóvel tem vários
 * megabytes e passá-la por uma ação do servidor gastava a largura de banda duas
 * vezes; e a Vercel recusa pedidos acima de poucos megabytes, o que faria
 * falhar exatamente as fotografias tiradas na loja, que são as que interessam.
 *
 * Antes de enviar, a imagem é redimensionada aqui. É isso que traz uma foto de
 * 4 MB para uns 300 kB e a faz caber no limite do balde.
 */

interface Props {
  siteId: string;
  ownerId: string;
  slot: 'cover' | 'gallery';
  label: string;
}

/** Redimensiona pelo lado maior e devolve um JPEG. */
async function shrink(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);

  const scale = Math.min(1, PHOTO_MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext('2d');
  if (!context) throw new Error('O browser não conseguiu processar a imagem.');

  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, 'image/jpeg', PHOTO_QUALITY),
  );

  if (!blob) throw new Error('O browser não conseguiu processar a imagem.');
  return blob;
}

export function PhotoUpload({ siteId, ownerId, slot, label }: Props) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  async function handle(file: File) {
    setBusy(true);
    setError(null);

    try {
      const blob = await shrink(file);
      const supabase = createClient();
      const path = photoPath(ownerId, siteId, `${crypto.randomUUID()}.jpg`);

      const { error: uploadError } = await supabase.storage
        .from(PHOTO_BUCKET)
        .upload(path, blob, { contentType: 'image/jpeg', upsert: false });

      if (uploadError) throw new Error(uploadError.message);

      const {
        data: { publicUrl },
      } = supabase.storage.from(PHOTO_BUCKET).getPublicUrl(path);

      const form = new FormData();
      form.set('siteId', siteId);
      form.set('slot', slot);
      form.set('url', publicUrl);

      startTransition(() => {
        void attachPhoto(form);
      });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível carregar a fotografia.');
    } finally {
      setBusy(false);
      if (input.current) input.current.value = '';
    }
  }

  return (
    <div className="flex flex-col gap-1.5">
      <input
        ref={input}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        disabled={busy}
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void handle(file);
        }}
        className="hidden"
        id={`foto-${slot}`}
      />
      <label
        htmlFor={`foto-${slot}`}
        className={`cursor-pointer self-start rounded-md border border-black/15 px-3 py-2 text-sm font-medium dark:border-white/15 ${
          busy ? 'opacity-50' : 'hover:border-brand-500'
        }`}
      >
        {busy ? 'A carregar…' : label}
      </label>
      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}
