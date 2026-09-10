/**
 * Uma folha de teste para descobrir o que o telemóvel imprime.
 *
 * O PDF de uma landing page saía com um retângulo preto onde devia estar a
 * fotografia, e três tentativas de correção falharam porque o motor de
 * impressão do telemóvel não é o que desenha o ecrã e não há como o
 * interrogar daqui. Em vez de uma quarta adivinha, põe-se a MESMA imagem de
 * cinco maneiras diferentes, cada uma com o seu nome, e pede-se um PDF: as
 * que aparecerem no ficheiro são as que servem.
 *
 * Pública de propósito — quem a abre não precisa de sessão para responder a
 * uma pergunta sobre impressão, e não há aqui nada de ninguém.
 *
 * Apagar quando a resposta estiver arrumada no código.
 */

export const dynamic = 'force-static';

const REMOTA =
  'https://images.pexels.com/photos/287237/pexels-photo-287237.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940';
const LOCAL = '/arte/clinica/teste-impressao.svg';

function Caixa({ n, titulo, children }: { n: number; titulo: string; children: React.ReactNode }) {
  return (
    <section className="break-inside-avoid border-b border-black/15 py-5">
      <p className="mb-2 text-sm font-semibold">
        {n}. {titulo}
      </p>
      {children}
    </section>
  );
}

export default function TesteImpressao() {
  return (
    <main className="mx-auto max-w-2xl px-5 py-8">
      <style>{`
        @page { size: A4; margin: 10mm; }
        @media print { * { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
      `}</style>

      <h1 className="text-xl font-semibold">Teste de impressão</h1>
      <p className="mt-2 mb-6 text-sm opacity-70">
        Guarda esta página como PDF e manda-me uma captura do resultado. As caixas que aparecerem
        com imagem são as que o teu telemóvel sabe imprimir — e é essa a que fica no gerador de
        sites. Não precisas de perceber nada disto: basta dizeres quais é que aparecem.
      </p>

      <Caixa n={1} titulo="Imagem normal, do nosso servidor">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={LOCAL} alt="Teste 1" className="h-40 w-full object-cover" />
      </Caixa>

      <Caixa n={2} titulo="Imagem normal, de fora (Pexels)">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={REMOTA} alt="Teste 2" className="h-40 w-full object-cover" />
      </Caixa>

      <Caixa n={3} titulo="Imagem por cima de uma caixa preta">
        <div className="relative h-40 overflow-hidden bg-black">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={REMOTA} alt="Teste 3" className="absolute inset-0 h-full w-full object-cover" />
          <p className="absolute bottom-3 left-3 font-semibold text-white">texto por cima</p>
        </div>
      </Caixa>

      <Caixa n={4} titulo="Imagem como fundo da caixa">
        <div
          className="flex h-40 items-end bg-black bg-cover bg-center p-3"
          style={{ backgroundImage: `url("${REMOTA}")` }}
        >
          <p className="font-semibold text-white">texto por cima</p>
        </div>
      </Caixa>

      <Caixa n={5} titulo="Caixa preta sem imagem nenhuma">
        <div className="flex h-40 items-end bg-black p-3">
          <p className="font-semibold text-white">só cor de fundo</p>
        </div>
      </Caixa>
    </main>
  );
}
