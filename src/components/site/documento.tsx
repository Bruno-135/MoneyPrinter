import type { SiteDocument, SiteSection } from '@/lib/sites/sections';
import { fontHref, type SiteTheme } from '@/lib/sites/theme';
import { styleVars, type SiteStyle, type StyleId } from '@/lib/sites/style';

/**
 * Desenha um documento de site, secção a secção, PELA ORDEM QUE ELE TRAZ.
 *
 * É a peça que faltava. O `SiteRender` desenha sempre a mesma estrutura na
 * mesma ordem, e por isso a lista de `sections` dos modelos — que é metade do
 * que distingue um modelo do outro — nunca chegava ao ecrã: dois modelos com
 * ordens diferentes saíam iguais.
 *
 * Aqui a ordem manda. Um modelo que põe a reputação logo a seguir à abertura
 * (numa clínica, os números são o que tira o medo de marcar) fica mesmo assim.
 *
 * Só desenha o que o documento traz. Não vai buscar nada à base de dados e não
 * regista visitas: serve a biblioteca de modelos, onde o que se mostra é o
 * conteúdo de demonstração.
 */

interface Props {
  doc: SiteDocument;
  theme: SiteTheme;
  style: StyleId;
}

export function DocumentoRender({ doc, theme, style }: Props) {
  const site: SiteStyle = { ...theme, style };
  const letra = fontHref(theme);

  return (
    <div
      style={styleVars(site, 'light')}
      className="min-h-screen bg-[var(--site-bg)] text-[var(--site-fg)] [font-family:var(--site-font)]"
    >
      {letra && <link rel="stylesheet" href={letra} />}
      {doc.sections.map((seccao, i) => (
        <Seccao key={`${seccao.type}-${i}`} seccao={seccao} primeira={i === 0} />
      ))}
    </div>
  );
}

/** A largura útil e o ar em cima e em baixo, iguais em todas as secções. */
function Caixa({
  children,
  fundo,
  className = '',
}: {
  children: React.ReactNode;
  fundo?: boolean;
  className?: string;
}) {
  return (
    <section
      className={`px-6 py-[var(--site-section-y)] sm:px-10 ${fundo ? 'bg-[var(--site-surface)]' : ''} ${className}`}
    >
      <div className="mx-auto w-full max-w-[var(--site-container)]">{children}</div>
    </section>
  );
}

function Titulo({ children }: { children: React.ReactNode }) {
  return (
    <h2
      className="text-[length:var(--site-h2)] leading-[1.1] tracking-[var(--site-tracking)] text-balance [font-family:var(--site-font-display)] [font-weight:var(--site-weight)]"
    >
      {children}
    </h2>
  );
}

/** A legenda em maiúsculas pequenas, que é o detalhe de revista do desenho. */
function Legenda({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-xs tracking-[0.12em] uppercase opacity-55">{children}</span>
  );
}

function Foto({
  url,
  alt,
  proporcao,
}: {
  url: string;
  alt: string;
  proporcao: string;
}) {
  return (
    // Sem `next/image` de propósito: as imagens de demonstração são SVG
    // desenhados no momento pela rota `/arte`, e o optimizador não os melhora.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={url}
      alt={alt}
      className="h-full w-full object-cover"
      style={{ aspectRatio: proporcao }}
    />
  );
}

function Seccao({ seccao, primeira }: { seccao: SiteSection; primeira: boolean }) {
  switch (seccao.type) {
    case 'hero':
      return <Hero seccao={seccao} primeira={primeira} />;

    case 'sobre':
      return (
        <Caixa>
          <div className="grid gap-[var(--site-gap)] md:grid-cols-[7fr_5fr]">
            <div>
              <Titulo>{seccao.title}</Titulo>
              <div className="mt-6 flex max-w-[62ch] flex-col gap-4 text-[length:var(--site-body)] leading-[var(--site-leading)]">
                {seccao.paragraphs.map((p, i) => (
                  <p key={i}>{p}</p>
                ))}
              </div>
            </div>
            {seccao.photo && (
              <Foto url={seccao.photo.url} alt={seccao.photo.alt} proporcao="4 / 5" />
            )}
          </div>
        </Caixa>
      );

    case 'servicos':
      return (
        <Caixa fundo>
          <Titulo>{seccao.title}</Titulo>
          {seccao.intro && <p className="mt-4 max-w-[62ch] opacity-75">{seccao.intro}</p>}
          <ul className="mt-8 flex flex-col">
            {seccao.items.map((item) => (
              <li
                key={item.title}
                className="flex flex-wrap items-baseline gap-x-6 gap-y-1 border-t border-[var(--site-line)] py-4"
              >
                <span className="flex-1 text-lg [font-family:var(--site-font-display)]">
                  {item.title}
                </span>
                <span className="max-w-[46ch] flex-1 text-sm opacity-70">{item.text}</span>
              </li>
            ))}
          </ul>
        </Caixa>
      );

    case 'produtos':
      return (
        <Caixa>
          <Titulo>{seccao.title}</Titulo>
          {seccao.intro && <p className="mt-4 max-w-[62ch] opacity-75">{seccao.intro}</p>}
          <ul className="mt-8 flex flex-col">
            {seccao.items.map((item) => (
              <li
                key={item.name}
                className="flex flex-wrap items-baseline gap-x-4 border-t border-[var(--site-line)] py-3.5"
              >
                <span className="text-lg [font-family:var(--site-font-display)]">{item.name}</span>
                {item.description && (
                  <span className="flex-1 text-sm opacity-65">{item.description}</span>
                )}
                {/* O preço à direita e em tabular, como um menu de restaurante
                    caro: é o que faz a vírgula alinhar em coluna. */}
                {item.price && (
                  <span className="ml-auto text-lg tabular-nums">{item.price}</span>
                )}
              </li>
            ))}
          </ul>
        </Caixa>
      );

    case 'galeria':
      return (
        <Caixa>
          {seccao.title && <Titulo>{seccao.title}</Titulo>}
          <div className="mt-8 grid grid-cols-2 gap-2 md:grid-cols-3">
            {seccao.photos.map((f, i) => (
              <Foto key={i} url={f.url} alt={f.alt} proporcao="4 / 5" />
            ))}
          </div>
        </Caixa>
      );

    case 'diferenciais':
      return (
        <Caixa fundo>
          <Titulo>{seccao.title}</Titulo>
          <div className="mt-8 grid gap-[var(--site-gap)] sm:grid-cols-2 lg:grid-cols-3">
            {seccao.items.map((item, i) => (
              <div key={item.title}>
                {seccao.variant === 'numeros' && (
                  <span className="block text-4xl tabular-nums opacity-25 [font-family:var(--site-font-display)]">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                )}
                <h3 className="mt-2 text-lg [font-family:var(--site-font-display)]">
                  {item.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed opacity-70">{item.text}</p>
              </div>
            ))}
          </div>
        </Caixa>
      );

    case 'reputacao':
      return (
        <Caixa>
          <Titulo>{seccao.title}</Titulo>
          {(seccao.rating !== null || seccao.reviewsCount !== null) && (
            <div className="mt-8 flex flex-wrap items-baseline gap-x-10 gap-y-4">
              {seccao.rating !== null && (
                <div>
                  {/* O número grande em vez de estrelinhas: uma nota de 4,9
                      escrita a 72px diz mais do que cinco estrelas iguais às
                      de toda a gente. */}
                  <span className="block text-6xl tabular-nums text-[var(--site-accent)] [font-family:var(--site-font-display)]">
                    {seccao.rating.toString().replace('.', ',')}
                  </span>
                  <Legenda>média no Google</Legenda>
                </div>
              )}
              {seccao.reviewsCount !== null && (
                <div>
                  <span className="block text-6xl tabular-nums [font-family:var(--site-font-display)]">
                    {seccao.reviewsCount}
                  </span>
                  <Legenda>avaliações</Legenda>
                </div>
              )}
            </div>
          )}
          {seccao.quotes.length > 0 && (
            <div className="mt-10 flex flex-col gap-6">
              {seccao.quotes.map((q, i) => (
                <blockquote key={i} className="max-w-[62ch]">
                  <p className="text-lg leading-relaxed [font-family:var(--site-font-display)]">
                    &ldquo;{q.text}&rdquo;
                  </p>
                  <cite className="mt-2 block text-sm not-italic opacity-55">{q.author}</cite>
                </blockquote>
              ))}
            </div>
          )}
        </Caixa>
      );

    case 'faq':
      return (
        <Caixa fundo>
          <Titulo>{seccao.title}</Titulo>
          <div className="mt-8 flex max-w-[70ch] flex-col">
            {seccao.items.map((item) => (
              <div key={item.question} className="border-t border-[var(--site-line)] py-5">
                <h3 className="text-lg [font-family:var(--site-font-display)]">{item.question}</h3>
                <p className="mt-2 leading-[var(--site-leading)] opacity-75">{item.answer}</p>
              </div>
            ))}
          </div>
        </Caixa>
      );

    case 'localizacao':
      return (
        <Caixa>
          <Titulo>{seccao.title}</Titulo>
          {seccao.note && <p className="mt-4 max-w-[62ch] opacity-75">{seccao.note}</p>}
          {/* Sem morada nem horário escritos aqui: vêm dos dados do comércio
              quando o site é gerado. Um exemplo com uma morada a sério era o
              caminho para a morada da padaria aparecer numa clínica. */}
          <p className="mt-6 border-t border-[var(--site-line)] pt-4 text-sm opacity-45">
            A morada, o horário e o mapa do comércio entram aqui.
          </p>
        </Caixa>
      );

    case 'cta':
      return (
        <Caixa>
          <div className="flex flex-col items-start gap-6">
            <h2 className="max-w-[20ch] text-[length:var(--site-h2)] leading-[1.05] tracking-[var(--site-tracking)] text-balance [font-family:var(--site-font-display)] [font-weight:var(--site-weight)]">
              {seccao.headline}
            </h2>
            {seccao.text && <p className="max-w-[62ch] opacity-75">{seccao.text}</p>}
            <div className="flex flex-wrap gap-3">
              {seccao.ctas.map((c, i) => (
                // O PRIMEIRO é o principal, seja qual for a acção. Julgar pelo
                // `whatsapp` deixava páginas a acabar num botão de contorno,
                // que é o mesmo que acabar sem botão.
                <Botao key={c.label} label={c.label} principal={i === 0} />
              ))}
            </div>
          </div>
        </Caixa>
      );

    case 'cardapio':
      return (
        <Caixa fundo>
          <Titulo>{seccao.title}</Titulo>
          {seccao.intro && <p className="mt-4 max-w-[62ch] opacity-75">{seccao.intro}</p>}
          <p className="mt-8 text-sm opacity-55">
            O cardápio real vem dos pratos guardados no sistema, e aparece aqui.
          </p>
        </Caixa>
      );
  }
}

function Hero({
  seccao,
  primeira,
}: {
  seccao: Extract<SiteSection, { type: 'hero' }>;
  primeira: boolean;
}) {
  const texto = (
    <div className="flex flex-col items-start gap-5">
      {seccao.badge && (
        <span className="border border-[var(--site-line)] px-3 py-1.5 text-xs tracking-[0.12em] uppercase">
          {seccao.badge}
        </span>
      )}
      <h1
        className="max-w-[16ch] text-[length:var(--site-h1)] leading-[0.98] tracking-[var(--site-tracking)] text-balance [font-family:var(--site-font-display)] [font-weight:var(--site-weight)]"
      >
        {seccao.headline}
      </h1>
      <p className="max-w-[52ch] text-[length:var(--site-body)] leading-[var(--site-leading)] opacity-80">
        {seccao.subheadline}
      </p>
      <div className="flex flex-wrap gap-3">
        {seccao.ctas.map((c, i) => (
          <Botao key={c.label} label={c.label} principal={i === 0} />
        ))}
      </div>
    </div>
  );

  // `capa`: a fotografia ocupa o fundo todo e o texto vive por cima dela. É o
  // que o desenho da alimentação faz, e é o que distingue uma abertura
  // desenhada de uma caixa de texto com uma imagem ao lado.
  if (seccao.variant === 'capa' && seccao.photo) {
    return (
      <section className="relative isolate">
        <Foto url={seccao.photo.url} alt={seccao.photo.alt} proporcao="4 / 5" />
        <div className="absolute inset-0 bg-linear-to-t from-black/85 via-black/35 to-black/60" />
        <div className="absolute inset-0 flex items-end px-6 pb-12 sm:px-10">
          <div className="mx-auto w-full max-w-[var(--site-container)] text-white">{texto}</div>
        </div>
      </section>
    );
  }

  if (seccao.variant === 'split' && seccao.photo) {
    return (
      <Caixa className={primeira ? 'pt-12' : ''}>
        <div className="grid items-start gap-[var(--site-gap)] md:grid-cols-[6fr_5fr]">
          {texto}
          <Foto url={seccao.photo.url} alt={seccao.photo.alt} proporcao="3 / 2" />
        </div>
      </Caixa>
    );
  }

  return <Caixa className={primeira ? 'pt-12' : ''}>{texto}</Caixa>;
}

function Botao({ label, principal }: { label: string; principal: boolean }) {
  return (
    <span
      className={
        principal
          ? 'inline-flex h-12 items-center bg-[var(--site-accent)] px-5 text-sm font-semibold text-[var(--site-on-accent)]'
          : 'inline-flex h-12 items-center border border-current px-5 text-sm font-semibold'
      }
    >
      {label}
    </span>
  );
}
