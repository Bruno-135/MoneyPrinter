'use client';

/**
 * Botão de impressão.
 *
 * Existe como componente de cliente porque `window.print()` só corre no
 * browser. Não abre a janela sozinho ao carregar a página: uma impressão que
 * salta à frente antes de a pessoa ver o que vai imprimir é assustadora, e no
 * telemóvel muitas vezes nem funciona. Carrega-se quando se quer.
 */
export function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white"
    >
      Guardar como PDF
    </button>
  );
}
