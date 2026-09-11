'use client';

import { useState } from 'react';

/**
 * O botão que guarda a página em PDF.
 *
 * Chama `window.print()`, que é o que dá um PDF com texto selecionável, tamanho
 * de folha certo e sem precisar de um Chromium no servidor. O problema é que em
 * alguns browsers `window.print()` não faz absolutamente nada — sem erro, sem
 * aviso, sem janela. O Chrome, o Firefox, o Edge e o Opera no iPhone são todos
 * Safari por dentro, mas nenhum deles liga essa função a coisa nenhuma. Quem
 * carrega no botão fica a olhar para um ecrã que não mexeu, e a conclusão certa
 * é "isto está avariado".
 *
 * Por isso o botão faz duas coisas de cada vez: tenta imprimir E mostra o
 * caminho para o fazer à mão. A ajuda aparece SEMPRE depois do clique, e não só
 * quando se deteta um browser problemático — detetar browsers pelo texto do
 * `user-agent` é adivinhar, e uma adivinha errada aqui devolve o botão morto ao
 * sítio de onde veio. Assim, a página funciona mesmo nos browsers que ainda não
 * existem.
 *
 * O sistema só decide o TEXTO das instruções, nunca se elas aparecem. E lê-se
 * no clique, não durante o desenho: a primeira pintura tem de ser igual à do
 * servidor, senão a hidratação falha — e uma hidratação falhada deixa
 * exatamente o mesmo sintoma que estamos aqui a resolver, um botão que não
 * responde.
 */

type Sistema = 'ios-safari' | 'ios-outro' | 'android' | 'secretaria';

export function lerSistema(ua: string): Sistema {
  if (/iPad|iPhone|iPod/.test(ua)) {
    // No iPhone, "Chrome" e "Firefox" são embrulhos à volta do Safari. O nome
    // no user-agent é a única maneira de os distinguir, e é o embrulho que
    // decide se a impressão abre.
    return /CriOS|FxiOS|EdgiOS|OPiOS/.test(ua) ? 'ios-outro' : 'ios-safari';
  }
  if (/Android/.test(ua)) return 'android';
  return 'secretaria';
}

const INSTRUCOES: Record<Sistema, React.ReactNode> = {
  'ios-safari': (
    <>
      Toca no botão <strong>Partilhar</strong> (o quadrado com a seta para cima), desce até{' '}
      <strong>Imprimir</strong>, e na pré-visualização afasta dois dedos sobre a folha para a
      abrir em grande. Depois <strong>Partilhar &rsaquo; Guardar em Ficheiros</strong>.
    </>
  ),
  'ios-outro': (
    <>
      Este browser não consegue abrir a janela de impressão no iPhone — é uma limitação dele, não
      da página. <strong>Abre esta página no Safari</strong> e usa o botão Partilhar &rsaquo;
      Imprimir. É o caminho que funciona.
    </>
  ),
  android: (
    <>
      Abre o menu <strong>⋮</strong> do browser e escolhe <strong>Partilhar &rsaquo; Imprimir</strong>
      . Em <strong>Destino</strong>, escolhe <strong>Guardar como PDF</strong>.
    </>
  ),
  secretaria: (
    <>
      Carrega em <strong>Ctrl+P</strong> (Windows) ou <strong>⌘+P</strong> (Mac). Em{' '}
      <strong>Destino</strong>, escolhe <strong>Guardar como PDF</strong>.
    </>
  ),
};

export function BotaoImprimir({ label = 'Guardar como PDF' }: { label?: string }) {
  // `null` enquanto ninguém carregou. O sistema lê-se no clique e não antes:
  // é quando se precisa dele, e assim o primeiro desenho é igual ao do
  // servidor. Ler o `user-agent` durante o desenho faria a hidratação falhar —
  // e uma hidratação falhada deixa o botão sem resposta, que é exatamente o
  // problema que isto veio resolver.
  const [ajuda, setAjuda] = useState<Sistema | null>(null);

  return (
    <div className="flex flex-col items-end gap-2">
      <button
        type="button"
        onClick={() => {
          // A ajuda primeiro. Em alguns browsers `print()` segura a página
          // enquanto a janela está aberta, e a ajuda marcada a seguir só
          // apareceria depois de se fechar tudo — tarde de mais para quem está
          // a olhar para um ecrã que não mexeu.
          setAjuda(lerSistema(navigator.userAgent));
          try {
            window.print();
          } catch {
            // Não faz mal: as instruções em baixo dizem o caminho à mão.
          }
        }}
        className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white"
      >
        {label}
      </button>

      {ajuda && (
        <p className="nao-imprimir max-w-sm text-right text-xs leading-relaxed opacity-60">
          <strong>Não abriu nada?</strong> {INSTRUCOES[ajuda]}
        </p>
      )}
    </div>
  );
}
