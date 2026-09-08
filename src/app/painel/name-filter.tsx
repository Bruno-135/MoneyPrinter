'use client';

import { useRouter } from 'next/navigation';
import type { Route } from 'next';
import { useState } from 'react';

/**
 * Procurar um comércio pelo nome, dentro do que já está na lista.
 *
 * Não fala com a Google nem gasta nada: filtra o que já está gravado. É para
 * quando se tem quinhentos prospetos e se quer o "Mademoiselle" que se viu
 * ontem, ou todas as "padarias" cujo nome tem a palavra.
 *
 * Submete só ao carregar em Enter ou no botão, e não a cada letra: cada mudança
 * do endereço volta a desenhar a página no servidor, e fazer isso a cada tecla
 * dá uma lista a piscar.
 */
export function NameFilter({
  current,
  baseHref,
}: {
  current: string;
  /**
   * O endereço do painel com os OUTROS filtros já lá dentro e sem o nome,
   * montado no servidor. Recebe-se uma string e não uma função porque uma
   * função não atravessa a fronteira entre servidor e browser — e assim
   * continua a haver um só sítio a saber compor o endereço, que é o que impede
   * mudar um filtro e perder outro sem dar por isso.
   */
  baseHref: string;
}) {
  const router = useRouter();
  const [texto, setTexto] = useState(current);

  function submeter(valor: string) {
    const limpo = valor.trim();
    const separador = baseHref.includes('?') ? '&' : '?';
    const destino = limpo === '' ? baseHref : `${baseHref}${separador}nome=${encodeURIComponent(limpo)}`;

    router.push(destino as Route);
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        submeter(texto);
      }}
      className="flex flex-wrap gap-2"
    >
      <input
        value={texto}
        onChange={(event) => setTexto(event.target.value)}
        placeholder="Procurar pelo nome do comércio…"
        aria-label="Procurar pelo nome do comércio"
        className="min-w-48 flex-1 rounded-md border border-black/15 bg-white/60 px-3 py-2 text-sm outline-none focus:border-brand-500 dark:border-white/15 dark:bg-white/5"
      />
      <button
        type="submit"
        className="shrink-0 rounded-md border border-black/15 px-4 py-2 text-sm font-medium dark:border-white/15"
      >
        Procurar
      </button>
      {current !== '' && (
        <button
          type="button"
          onClick={() => {
            setTexto('');
            submeter('');
          }}
          className="shrink-0 rounded-md px-3 py-2 text-sm underline underline-offset-4 opacity-60"
        >
          Limpar
        </button>
      )}
    </form>
  );
}
