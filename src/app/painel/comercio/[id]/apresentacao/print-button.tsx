'use client';

/**
 * Abre a caixa de impressão do navegador.
 *
 * É um componente de cliente à parte porque `window.print` só existe no
 * browser, e o resto da apresentação é toda renderizada no servidor.
 */
export function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="rounded-md bg-brand-600 px-4 py-2 font-medium text-white"
    >
      Guardar em PDF
    </button>
  );
}
