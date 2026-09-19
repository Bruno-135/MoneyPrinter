import { themeVars, fontHref, type SiteTheme } from '@/lib/sites/theme';
import {
  desconto,
  escreverPreco,
  ETIQUETA_DO_ESTADO,
  familiasDoCatalogo,
  linkDaPeca,
  type Peca,
} from '@/lib/loja/peca';

/**
 * A loja, desenhada a partir do catálogo.
 *
 * NÃO é gerada por IA, e é essa a diferença. Uma página escrita por um modelo a
 * partir de um texto sai diferente de cada vez, com menus que não levam a lado
 * nenhum e peças sem preço — porque o modelo não tem catálogo nenhum para ler.
 * Esta lê `site_products`: os menus funcionam porque os links são escritos
 * aqui, e os preços aparecem porque vêm da base de dados.
 *
 * O desenho é o do Claude Design: fundo quase preto, um acento só, rótulos em
 * maiúsculas, grelha de duas colunas no telemóvel e quatro no computador, zero
 * cantos redondos e zero sombras. As cores vêm do tema do site, portanto o
 * mesmo desenho serve uma paleta clara sem se mexer em nada.
 */

export type EcraDaLoja =
  | { tipo: 'inicio' }
  | { tipo: 'familia'; familia: string }
  | { tipo: 'peca'; peca: Peca }
  | { tipo: 'como-comprar' }
  | { tipo: 'contacto' };

export interface LojaProps {
  ecra: EcraDaLoja;
  nome: string;
  morada: string | null;
  telefone: string | null;
  whatsapp: string | null;
  theme: SiteTheme;
  pecas: readonly Peca[];
  /** A raiz do site — `/s/<code>`. Todos os links se penduram nela. */
  raiz: string;
  /** O endereço absoluto, para a mensagem de WhatsApp levar a morada certa. */
  base: string;
}

function titulo(familia: string): string {
  return familia.charAt(0).toUpperCase() + familia.slice(1);
}

/** As entradas do menu, iguais em todos os ecrãs. */
function entradas(raiz: string, pecas: readonly Peca[]) {
  return [
    { rotulo: 'Início', href: raiz, chave: 'inicio' },
    ...familiasDoCatalogo(pecas).map((f) => ({
      rotulo: titulo(f),
      href: `${raiz}/${f}`,
      chave: `familia:${f}`,
    })),
    { rotulo: 'Como comprar', href: `${raiz}/como-comprar`, chave: 'como-comprar' },
    { rotulo: 'Contacto', href: `${raiz}/contacto`, chave: 'contacto' },
  ];
}

function chaveDoEcra(ecra: EcraDaLoja): string {
  if (ecra.tipo === 'familia') return `familia:${ecra.familia}`;
  if (ecra.tipo === 'peca') return `familia:${ecra.peca.familia ?? ''}`;
  return ecra.tipo;
}

/** O cartão de uma peça na grelha. */
function Cartao({ peca, raiz }: { peca: Peca; raiz: string }) {
  const preco = escreverPreco(peca.precoCentimos, peca.moeda);
  const anterior = escreverPreco(peca.precoAnteriorCentimos, peca.moeda);
  const foto = peca.fotos[0];

  return (
    <a
      href={`${raiz}/peca/${encodeURIComponent(peca.ref)}`}
      className="group flex flex-col gap-2 no-underline"
      style={{ color: 'var(--site-fg)', opacity: peca.esgotado ? 0.55 : 1 }}
    >
      <div
        className="relative w-full overflow-hidden"
        style={{ aspectRatio: '4 / 5', background: 'var(--site-surface)' }}
      >
        {foto ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={foto.url}
            alt={foto.alt || peca.nome}
            loading="lazy"
            className="h-full w-full object-cover"
          />
        ) : (
          <span
            className="absolute inset-0 grid place-items-center text-[11px] tracking-[0.14em] uppercase"
            style={{ color: 'var(--site-fg)', opacity: 0.45 }}
          >
            sem fotografia
          </span>
        )}

        {peca.esgotado && (
          <span
            className="absolute inset-x-0 bottom-0 py-1.5 text-center text-[10px] tracking-[0.14em] uppercase"
            style={{ background: 'var(--site-fg)', color: 'var(--site-bg)' }}
          >
            esgotado
          </span>
        )}

        {!peca.esgotado && peca.estado !== 'novo' && (
          <span
            className="absolute top-2 left-2 px-1.5 py-1 text-[10px] tracking-[0.10em] uppercase"
            style={{ background: 'var(--site-surface)', color: 'var(--site-fg)' }}
          >
            {ETIQUETA_DO_ESTADO[peca.estado]}
          </span>
        )}
      </div>

      <div className="flex flex-col gap-0.5">
        <span className="text-[15px] leading-tight font-medium">{peca.nome}</span>
        <span className="flex flex-wrap items-baseline gap-x-2 text-[15px]">
          {preco && <span className="tabular-nums">{preco}</span>}
          {anterior && desconto(peca) !== null && (
            <span className="text-[13px] line-through opacity-55 tabular-nums">{anterior}</span>
          )}
        </span>
        {peca.tamanhos.length > 0 && (
          <span className="text-[11px] tracking-[0.10em] uppercase opacity-60">
            {peca.tamanhos.join(' · ')}
          </span>
        )}
      </div>
    </a>
  );
}

function Grelha({ pecas, raiz }: { pecas: readonly Peca[]; raiz: string }) {
  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-4">
      {pecas.map((p) => (
        <Cartao key={p.id} peca={p} raiz={raiz} />
      ))}
    </div>
  );
}

function Rotulo({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-4 text-[11px] tracking-[0.16em] uppercase" style={{ opacity: 0.6 }}>
      {children}
    </p>
  );
}

export function LojaRender(props: LojaProps) {
  const { ecra, nome, morada, telefone, whatsapp, theme, pecas, raiz, base } = props;

  const menu = entradas(raiz, pecas);
  const aqui = chaveDoEcra(ecra);
  const letra = fontHref(theme);

  const disponiveis = pecas.filter((p) => !p.esgotado);
  const destaques = disponiveis.filter((p) => p.destaque);
  const naGrelha = destaques.length >= 2 ? destaques : disponiveis;

  return (
    <div
      className="min-h-screen"
      style={{
        ...themeVars(theme, 'light'),
        background: 'var(--site-bg)',
        color: 'var(--site-fg)',
        fontFamily: 'var(--site-font)',
      }}
    >
      {letra && <link rel="stylesheet" href={letra} />}

      {/* Barra de topo, igual em todos os ecrãs. */}
      <header
        className="sticky top-0 z-30 flex items-center gap-3 px-5 py-3.5"
        style={{ background: 'var(--site-bg)', borderBottom: '1px solid var(--site-line)' }}
      >
        <a
          href={raiz}
          className="text-[13px] font-semibold tracking-[0.06em] no-underline"
          style={{ color: 'var(--site-fg)' }}
        >
          {nome}
        </a>
        {whatsapp && (
          <a
            href={`https://wa.me/${whatsapp.replace(/[^0-9]/g, '')}`}
            className="ml-auto text-[11px] tracking-[0.12em] uppercase no-underline"
            style={{ color: 'var(--site-accent)' }}
          >
            WhatsApp
          </a>
        )}
      </header>

      {/* O menu. Os links são escritos aqui, portanto funcionam. */}
      <nav
        className="flex flex-wrap gap-x-5 gap-y-1.5 px-5 py-3"
        style={{ borderBottom: '1px solid var(--site-line)' }}
      >
        {menu.map((e) => {
          const aceso = e.chave === aqui;
          return (
            <a
              key={e.chave}
              href={e.href}
              className="text-[11px] tracking-[0.14em] uppercase no-underline"
              style={{
                color: aceso ? 'var(--site-accent)' : 'var(--site-fg)',
                opacity: aceso ? 1 : 0.7,
              }}
            >
              {e.rotulo}
            </a>
          );
        })}
      </nav>

      <main className="mx-auto w-full max-w-[1280px] px-5 py-8">
        {ecra.tipo === 'inicio' && (
          <div className="flex flex-col gap-10">
            <div>
              <Rotulo>{[nome, morada].filter(Boolean).join(' · ')}</Rotulo>
              <h1
                className="text-[30px] leading-[1.08] font-bold tracking-[-0.9px] sm:text-[52px] sm:tracking-[-1.6px]"
                style={{ fontFamily: 'var(--site-font-display)' }}
              >
                {disponiveis.length > 0
                  ? 'Peça a peça, escolhida à mão.'
                  : 'A montra está a ser preparada.'}
              </h1>
            </div>

            {naGrelha.length > 0 ? (
              <section>
                <Rotulo>{destaques.length >= 2 ? 'Destaques' : 'Na loja agora'}</Rotulo>
                <Grelha pecas={naGrelha} raiz={raiz} />
              </section>
            ) : (
              <p className="text-sm opacity-70">
                Ainda não há peças publicadas. Fale connosco e dizemos o que temos.
              </p>
            )}

            {pecas.some((p) => p.esgotado) && (
              <section>
                <Rotulo>Já saíram</Rotulo>
                <Grelha pecas={pecas.filter((p) => p.esgotado)} raiz={raiz} />
              </section>
            )}
          </div>
        )}

        {ecra.tipo === 'familia' && (
          <div className="flex flex-col gap-8">
            <div>
              <Rotulo>{pecas.filter((p) => p.familia === ecra.familia).length} peças</Rotulo>
              <h1
                className="text-[32px] leading-[1.05] font-bold tracking-[-0.9px]"
                style={{ fontFamily: 'var(--site-font-display)' }}
              >
                {titulo(ecra.familia)}
              </h1>
            </div>
            <Grelha pecas={pecas.filter((p) => p.familia === ecra.familia)} raiz={raiz} />
          </div>
        )}

        {ecra.tipo === 'peca' && (
          <FichaDaPeca peca={ecra.peca} raiz={raiz} base={base} whatsapp={whatsapp} pecas={pecas} />
        )}

        {ecra.tipo === 'como-comprar' && (
          <ComoComprar nome={nome} whatsapp={whatsapp} telefone={telefone} />
        )}

        {ecra.tipo === 'contacto' && (
          <Contacto nome={nome} morada={morada} telefone={telefone} whatsapp={whatsapp} />
        )}
      </main>

      <footer
        className="mt-8 flex flex-col gap-2 px-5 py-8 text-[13px]"
        style={{ borderTop: '1px solid var(--site-line)', opacity: 0.75 }}
      >
        <span className="font-medium">{nome}</span>
        {morada && <span>{morada}</span>}
        {telefone && (
          <a href={`tel:${telefone}`} className="no-underline" style={{ color: 'var(--site-fg)' }}>
            {telefone}
          </a>
        )}
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
          {menu.map((e) => (
            <a
              key={e.chave}
              href={e.href}
              className="text-[11px] tracking-[0.12em] uppercase no-underline"
              style={{ color: 'var(--site-fg)' }}
            >
              {e.rotulo}
            </a>
          ))}
        </div>
      </footer>
    </div>
  );
}

/** A ficha de uma peça. É aqui que a venda se fecha. */
function FichaDaPeca({
  peca,
  raiz,
  base,
  whatsapp,
  pecas,
}: {
  peca: Peca;
  raiz: string;
  base: string;
  whatsapp: string | null;
  pecas: readonly Peca[];
}) {
  const endereco = `${base}${raiz}/peca/${encodeURIComponent(peca.ref)}`;
  const preco = escreverPreco(peca.precoCentimos, peca.moeda);
  const anterior = escreverPreco(peca.precoAnteriorCentimos, peca.moeda);
  const poupanca = desconto(peca);
  const ficha = Object.entries(peca.ficha);

  const parecidas = pecas
    .filter((p) => p.id !== peca.id && !p.esgotado && p.familia === peca.familia)
    .slice(0, 4);

  return (
    <div className="flex flex-col gap-8">
      <a
        href={peca.familia ? `${raiz}/${peca.familia}` : raiz}
        className="text-[11px] tracking-[0.14em] uppercase no-underline"
        style={{ color: 'var(--site-fg)', opacity: 0.6 }}
      >
        ← {peca.familia ? titulo(peca.familia) : 'Início'}
      </a>

      <div className="grid gap-8 lg:grid-cols-2">
        <div className="flex flex-col gap-3">
          {peca.fotos.length > 0 ? (
            peca.fotos.map((f, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={f.url}
                src={f.url}
                alt={f.alt || `${peca.nome} — ${i + 1}`}
                loading={i === 0 ? 'eager' : 'lazy'}
                className="w-full object-cover"
                style={{ aspectRatio: '4 / 5', background: 'var(--site-surface)' }}
              />
            ))
          ) : (
            <div
              className="grid w-full place-items-center text-[11px] tracking-[0.14em] uppercase"
              style={{ aspectRatio: '4 / 5', background: 'var(--site-surface)', opacity: 0.5 }}
            >
              sem fotografia
            </div>
          )}
        </div>

        <div className="flex flex-col gap-6">
          <div>
            <Rotulo>
              {[peca.familia && titulo(peca.familia), peca.tipo, `ref ${peca.ref}`]
                .filter(Boolean)
                .join(' · ')}
            </Rotulo>
            <h1
              className="text-[28px] leading-[1.1] font-bold tracking-[-0.6px]"
              style={{ fontFamily: 'var(--site-font-display)' }}
            >
              {peca.nome}
            </h1>

            <p className="mt-3 flex flex-wrap items-baseline gap-x-3">
              {preco && <span className="text-[24px] font-bold tabular-nums">{preco}</span>}
              {anterior && poupanca !== null && (
                <>
                  <span className="text-[15px] line-through opacity-55 tabular-nums">
                    {anterior}
                  </span>
                  <span
                    className="px-1.5 py-0.5 text-[11px] tracking-[0.1em] uppercase"
                    style={{ background: 'var(--site-accent)', color: 'var(--site-on-accent)' }}
                  >
                    −{poupanca}%
                  </span>
                </>
              )}
            </p>
          </div>

          {(peca.estado !== 'novo' || peca.notaDoEstado) && (
            <div style={{ borderTop: '1px solid var(--site-line)', paddingTop: '16px' }}>
              <Rotulo>Estado da peça</Rotulo>
              <p className="text-[15px]">
                {ETIQUETA_DO_ESTADO[peca.estado]}
                {peca.notaDoEstado ? `. ${peca.notaDoEstado}` : '.'}
              </p>
            </div>
          )}

          {peca.descricao && <p className="text-[15px] leading-[1.6]">{peca.descricao}</p>}

          {/* O momento decisivo. Cada tamanho é o seu link, com a mensagem já
              escrita — sem selector, que precisaria de JavaScript e não
              acrescentaria nada num telemóvel. */}
          {whatsapp && !peca.esgotado && (
            <div style={{ borderTop: '1px solid var(--site-line)', paddingTop: '16px' }}>
              <Rotulo>{peca.tamanhos.length > 0 ? 'Escolha o tamanho' : 'Falar connosco'}</Rotulo>
              <div className="flex flex-wrap gap-2">
                {(peca.tamanhos.length > 0 ? peca.tamanhos : [null]).map((t) => (
                  <a
                    key={t ?? 'unico'}
                    href={linkDaPeca(whatsapp, peca, t, endereco)}
                    className="px-4 py-3 text-[14px] font-medium no-underline"
                    style={{
                      background: 'var(--site-accent)',
                      color: 'var(--site-on-accent)',
                      minWidth: '64px',
                      textAlign: 'center',
                    }}
                  >
                    {t ?? 'Pedir esta peça'}
                  </a>
                ))}
              </div>
              <p className="mt-2 text-[12px] opacity-65">
                Abre o WhatsApp com a peça, a referência e o tamanho já escritos.
              </p>
            </div>
          )}

          {peca.esgotado && (
            <p
              className="px-4 py-3 text-[14px]"
              style={{ background: 'var(--site-surface)' }}
            >
              Esta peça já saiu. Fale connosco — pode haver outra parecida.
            </p>
          )}

          {ficha.length > 0 && (
            <div style={{ borderTop: '1px solid var(--site-line)', paddingTop: '16px' }}>
              <Rotulo>Ficha técnica</Rotulo>
              <dl className="flex flex-col gap-1.5 text-[14px]">
                {ficha.map(([chave, valor]) => (
                  <div key={chave} className="flex justify-between gap-4">
                    <dt className="opacity-65">{chave}</dt>
                    <dd className="text-right">{valor}</dd>
                  </div>
                ))}
              </dl>
            </div>
          )}

          {peca.cor && (
            <p className="text-[13px] opacity-70">
              Cor: <span style={{ opacity: 1 }}>{peca.cor}</span>
            </p>
          )}
        </div>
      </div>

      {parecidas.length > 0 && (
        <section style={{ borderTop: '1px solid var(--site-line)', paddingTop: '32px' }}>
          <Rotulo>Também temos</Rotulo>
          <Grelha pecas={parecidas} raiz={raiz} />
        </section>
      )}
    </div>
  );
}

function ComoComprar({
  nome,
  whatsapp,
  telefone,
}: {
  nome: string;
  whatsapp: string | null;
  telefone: string | null;
}) {
  const passos = [
    ['Escolher a peça e o tamanho', 'Na ficha da peça, carregue no seu tamanho. Os esgotados não têm botão.'],
    ['Mandar a mensagem já escrita', `Abre o WhatsApp com a peça, a referência e o tamanho. Responde uma pessoa da ${nome}.`],
    ['Combinar o pagamento', 'Diz-nos como prefere pagar e enviamos os dados ou o link na conversa.'],
    ['Levantar na loja ou receber', 'Combinamos a entrega ou a recolha na mesma conversa.'],
  ];

  const meios = [
    ['Transferência bancária', 'Enviamos o IBAN na conversa e a peça segue assim que virmos o comprovativo.'],
    ['MB WAY', 'Pedimos o número de telemóvel associado e enviamos o pedido de pagamento.'],
    ['Cartão de crédito', 'Enviamos um link de pagamento seguro na conversa.'],
    ['Klarna', 'Diga-nos na mensagem se quer pagar a prestações e explicamos como.'],
  ];

  return (
    <div className="flex flex-col gap-10">
      <div>
        <Rotulo>Como comprar</Rotulo>
        <h1
          className="text-[30px] leading-[1.08] font-bold tracking-[-0.9px]"
          style={{ fontFamily: 'var(--site-font-display)' }}
        >
          Não há carrinho. A compra faz-se por mensagem.
        </h1>
        <p className="mt-3 max-w-[60ch] text-[15px] leading-[1.6] opacity-80">
          Escolhe a peça, carrega no tamanho, e a mensagem abre já escrita. O pagamento combina-se
          na conversa — nesta página não se paga nada.
        </p>
      </div>

      <ol className="flex flex-col gap-5">
        {passos.map(([titulo, texto], i) => (
          <li key={titulo} className="flex gap-4">
            <span
              className="shrink-0 text-[11px] tracking-[0.14em] tabular-nums"
              style={{ color: 'var(--site-accent)' }}
            >
              {String(i + 1).padStart(2, '0')}
            </span>
            <span>
              <span className="block text-[15px] font-medium">{titulo}</span>
              <span className="mt-0.5 block text-[14px] opacity-75">{texto}</span>
            </span>
          </li>
        ))}
      </ol>

      <section>
        <Rotulo>Meios de pagamento</Rotulo>
        <div className="grid gap-3 sm:grid-cols-2">
          {meios.map(([titulo, texto]) => (
            <div key={titulo} className="p-4" style={{ background: 'var(--site-surface)' }}>
              <p className="text-[14px] font-medium">{titulo}</p>
              <p className="mt-1 text-[13px] opacity-75">{texto}</p>
            </div>
          ))}
        </div>
        <p className="mt-3 text-[13px] opacity-65">
          Nenhum destes cobra nesta página. Todos se combinam na conversa.
        </p>
      </section>

      {(whatsapp || telefone) && (
        <div className="flex flex-wrap gap-3">
          {whatsapp && (
            <a
              href={`https://wa.me/${whatsapp.replace(/[^0-9]/g, '')}`}
              className="px-5 py-3 text-[14px] font-medium no-underline"
              style={{ background: 'var(--site-accent)', color: 'var(--site-on-accent)' }}
            >
              Falar por WhatsApp
            </a>
          )}
          {telefone && (
            <a
              href={`tel:${telefone}`}
              className="px-5 py-3 text-[14px] font-medium no-underline"
              style={{ border: '1px solid var(--site-line)', color: 'var(--site-fg)' }}
            >
              {telefone}
            </a>
          )}
        </div>
      )}
    </div>
  );
}

function Contacto({
  nome,
  morada,
  telefone,
  whatsapp,
}: {
  nome: string;
  morada: string | null;
  telefone: string | null;
  whatsapp: string | null;
}) {
  return (
    <div className="flex flex-col gap-8">
      <div>
        <Rotulo>Contacto</Rotulo>
        <h1
          className="text-[30px] leading-[1.08] font-bold tracking-[-0.9px]"
          style={{ fontFamily: 'var(--site-font-display)' }}
        >
          {nome}
        </h1>
      </div>

      <dl className="flex flex-col gap-4 text-[15px]">
        {morada && (
          <div>
            <dt className="text-[11px] tracking-[0.14em] uppercase opacity-60">Morada</dt>
            <dd className="mt-1">{morada}</dd>
          </div>
        )}
        {telefone && (
          <div>
            <dt className="text-[11px] tracking-[0.14em] uppercase opacity-60">Telefone</dt>
            <dd className="mt-1">
              <a href={`tel:${telefone}`} className="no-underline" style={{ color: 'var(--site-fg)' }}>
                {telefone}
              </a>
            </dd>
          </div>
        )}
      </dl>

      {whatsapp && (
        <a
          href={`https://wa.me/${whatsapp.replace(/[^0-9]/g, '')}`}
          className="self-start px-5 py-3 text-[14px] font-medium no-underline"
          style={{ background: 'var(--site-accent)', color: 'var(--site-on-accent)' }}
        >
          Falar por WhatsApp
        </a>
      )}
    </div>
  );
}
