import Link from 'next/link';
import type { Route } from 'next';
import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { loadSite } from '@/lib/sites/load';
import { SiteRender } from '@/components/site/site-render';
import { CustomHtmlSite } from '@/components/site/custom-html';
import { BotaoImprimir } from '@/components/botao-imprimir';

/**
 * O site inteiro em PDF, uma secção por folha, num ficheiro só.
 *
 * Isto é diferente da apresentação em /painel/comercio/[id]/apresentacao, e a
 * diferença importa: a apresentação é uma folha de venda SOBRE o negócio, para
 * ti levares à reunião. Isto é uma fotografia do SITE, para o dono ver como a
 * página dele vai ficar sem precisar de a ter no ar. São dois documentos com
 * dois destinatários.
 *
 * Gera-se pela impressão do browser em vez de um Chrome no servidor. A
 * alternativa seria mais uma peça a manter, mais custo de execução, e o mesmo
 * papel no fim. Se um dia for preciso enviar o PDF por email sem alguém o
 * abrir, aí mudamos.
 *
 * Três formatos, porque servem três conversas diferentes:
 *
 *   secções  — uma folha por secção, A4 em pé. É o documento de trabalho:
 *              vê-se cada parte em grande e escreve-se ao lado.
 *   paisagem — a folha deitada, com a página inteira a correr sem cortes.
 *              É o mais parecido com abrir o site num computador.
 *   telemóvel— folhas do tamanho de um telemóvel, com a página desenhada
 *              com as regras do telemóvel — tal como o cliente do
 *              comerciante a vai ver.
 *
 * Nos dois últimos, a página é desenhada dentro de uma caixa de largura fixa —
 * 1122 pontos para a folha deitada, 390 para o telemóvel. Funciona porque o
 * desenho do site responde à largura do BLOCO onde está (`@container`) e não à
 * da janela: pôr o site numa caixa de 390 pontos dá a mesma página que um
 * telemóvel daria, seja qual for o aparelho onde se carrega em imprimir.
 *
 * Houve aqui um enquadramento (`<iframe>`) a fazer este trabalho, e teve de
 * sair: o motor de impressão do telemóvel não desenha as imagens que estão
 * dentro de um enquadramento, e o PDF saía com um retângulo preto no lugar da
 * fotografia. O sintoma dizia-o com todas as letras — "por secções", que não
 * usava enquadramento, era o único que saía bem.
 */

export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ formato?: string }>;
}

const FORMATOS = {
  seccoes: {
    label: 'Por secções',
    explica: 'Uma folha por secção, A4 em pé. Bom para rever e anotar.',
    // Margem estreita de propósito: a capa tem uma foto que sangra até ao
    // limite e uma margem larga cortava-a com uma tira branca.
    page: '@page { size: A4; margin: 10mm; }',
    // Sem moldura: este formato quer mesmo a quebra por secção que o render
    // faz no modo de impressão.
    largura: null,
  },
  paisagem: {
    label: 'Paisagem',
    explica: 'Folha deitada e página a correr, como se abrisse o site num computador.',
    page: '@page { size: A4 landscape; margin: 0; }',
    // 1122 pontos é exatamente a largura de uma folha A4 deitada. Sendo igual,
    // não é preciso encolher nada: o que se vê é tamanho real.
    largura: 1122,
  },
  movel: {
    label: 'Telemóvel',
    explica: 'Folhas do tamanho de um telemóvel — é assim que os clientes dele vão ver.',
    // 390 x 844 pontos é o ecrã de um telemóvel comum, convertido em
    // milímetros para o tamanho da folha bater certo com a moldura.
    page: '@page { size: 103.19mm 223.31mm; margin: 0; }',
    largura: 390,
  },
} as const;

type FormatoId = keyof typeof FORMATOS;

function lerFormato(valor: string | undefined): FormatoId {
  return valor === 'paisagem' || valor === 'movel' || valor === 'seccoes' ? valor : 'seccoes';
}

export default async function SitePdfPage({ params, searchParams }: Props) {
  const { id } = await params;
  const formato = lerFormato((await searchParams).formato);
  const escolhido = FORMATOS[formato];

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect('/entrar');

  const loaded = await loadSite(supabase, id);
  if (!loaded) notFound();

  const { site, content, theme, menu, isFoodService } = loaded;

  return (
    <>
      {/*
        As regras de impressão vivem aqui e não no globals.css porque só dizem
        respeito a esta página — e porque mudam com o formato escolhido, que só
        se sabe no servidor.
      */}
      <style>{`
        ${escolhido.page}

        @media print {
          /* O fundo colorido do tema não sai na impressão sem isto. Sem ele o
             PDF sai branco e o comerciante não vê a paleta que escolheu — que
             é metade do que ele está a avaliar. */
          * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .nao-imprimir { display: none !important; }
        }
      `}</style>

      <div className="nao-imprimir border-b border-black/10 bg-[var(--background)] dark:border-white/10">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-4 gap-y-3 px-6 py-4">
          <Link
            href={`/painel/site/${id}/previa`}
            className="text-sm underline underline-offset-4 opacity-60"
          >
            &larr; Voltar à pré-visualização
          </Link>
          <div className="ml-auto flex items-center gap-3">
            <BotaoImprimir />
          </div>
        </div>

        {/* A escolha do formato. São ligações e não botões de cliente porque
            o que muda é a regra `@page`, que tem de vir já escrita do
            servidor — não se pode trocar depois de a janela de impressão
            abrir. */}
        <div className="mx-auto flex max-w-5xl flex-wrap gap-2 px-6 pb-3">
          {(Object.keys(FORMATOS) as FormatoId[]).map((id_formato) => (
            <Link
              key={id_formato}
              href={`/painel/site/${id}/pdf?formato=${id_formato}` as Route}
              className={`rounded-full border px-4 py-1.5 text-sm font-medium ${
                id_formato === formato
                  ? 'border-brand-500 bg-brand-500/10 text-brand-600 dark:text-brand-400'
                  : 'border-black/15 opacity-70 dark:border-white/20'
              }`}
            >
              {FORMATOS[id_formato].label}
            </Link>
          ))}
        </div>

        <div className="mx-auto max-w-5xl px-6 pb-4 text-sm opacity-60">
          {escolhido.explica} Carrega em <strong>Guardar como PDF</strong> e, na janela que abre,
          escolhe <strong>Destino &rsaquo; Guardar como PDF</strong>.
          {formato !== 'seccoes' && (
            <>
              {' '}
              Confirma que <strong>Margens</strong> está em <em>Nenhuma</em> e que{' '}
              <strong>Gráficos de fundo</strong> está ligado — sem isso o browser corta a
              fotografia e deita fora as cores.
            </>
          )}{' '}
          Depois é só mandar o ficheiro ao dono por WhatsApp ou email.
        </div>


      </div>

      {/*
        A caixa de largura fixa é o que dá o desenho certo a cada formato. Sem
        largura (o formato por secções), a página ocupa a folha toda.
      */}
      <div
        className="mx-auto"
        style={escolhido.largura === null ? undefined : { width: escolhido.largura }}
      >
        {site.custom_html ? (
          <CustomHtmlSite html={site.custom_html} forPrint={escolhido.largura === null} />
        ) : (
          <SiteRender
            /* Nos formatos de largura fixa mostra-se a página como ela É, com
               a fotografia em fundo e os botões — que é justamente o que se
               quer mostrar ao comerciante. A quebra por secção só faz sentido
               no formato A4 em pé. */
            mode={escolhido.largura === null ? 'print' : 'preview'}
            semente={site.public_code}
            content={content}
            theme={theme}
            menu={menu}
            isFoodService={isFoodService}
            whatsappNumber={site.whatsapp_number_e164}
            whatsappGreeting={site.whatsapp_greeting}
          />
        )}
      </div>
    </>
  );
}
