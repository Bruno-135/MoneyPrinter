import type { ReactNode } from 'react';
import type { Database } from '@/types/database.types';
import type { SiteContent, SitePhoto } from '@/lib/sites/content';
import { type SiteTheme, themeVars } from '@/lib/sites/theme';
import { formatPrice } from '@/lib/sites/repository';
import { whatsappUrl } from '@/lib/places/links';
import { arteUrl } from '@/lib/sites/imagens/arte';

/**
 * O desenho da landing page, num sítio só.
 *
 * Três ecrãs mostram esta página: o site público em /s/[code], a
 * pré-visualização do painel e o PDF. Se cada um tivesse o seu próprio render,
 * o que o comerciante aprova no PDF deixaria de ser o que fica no ar — e essa
 * é precisamente a promessa que se está a vender. Por isso há um componente e
 * três modos.
 *
 * O que muda entre modos:
 *
 *   public   — liga os cliques ao registo de visitas; é o único que conta.
 *   preview  — igual ao público, sem registar nada. Ver a proposta não é
 *              visita de cliente, e contaminar o relatório mensal com os teus
 *              próprios cliques estragaria o argumento da mensalidade.
 *   print    — quebra de página entre secções e nada que dependa de clicar.
 *
 * O envolvimento dos links é injetado de fora (`linkWrapper`) para este
 * ficheiro não precisar de ser um componente de cliente: o registo de visitas
 * vive no seu próprio ficheiro `'use client'` e só é carregado pelo modo que o
 * usa.
 */

type MenuItem = Database['public']['Tables']['menu_items']['Row'];

export type RenderMode = 'public' | 'preview' | 'print';

export interface SiteLinkProps {
  href: string;
  target: Database['public']['Enums']['click_target'];
  targetValue?: string;
  menuItemId?: string;
  className?: string;
  children: ReactNode;
}

export interface SiteRenderProps {
  mode: RenderMode;
  content: SiteContent;
  theme: SiteTheme;
  menu: MenuItem[];
  isFoodService: boolean;
  whatsappNumber: string | null;
  whatsappGreeting: string | null;
  /** Envolve os links no modo público, para registar o clique. */
  linkWrapper?: (props: SiteLinkProps) => ReactNode;
  /**
   * Identificador estável do site, usado como semente da imagem gerada.
   *
   * O código público serve: é único, não muda quando o comerciante edita o
   * texto, e é o mesmo nos três modos — por isso a capa que ele aprova no PDF
   * é exatamente a que fica no ar.
   */
  semente: string;
}

/** Uma secção do site. No PDF, cada uma é uma folha. */
function Sheet({
  mode,
  children,
  className = '',
}: {
  mode: RenderMode;
  children: ReactNode;
  className?: string;
}) {
  // `break-after-page` só tem efeito na impressão; no ecrã é inerte. Mesmo
  // assim só se põe no modo print, para o HTML dizer o que quer dizer.
  const pageBreak = mode === 'print' ? 'break-after-page break-inside-avoid' : '';
  return <section className={`${pageBreak} ${className}`}>{children}</section>;
}

/**
 * O título de uma secção: centrado, com um traço curto de acento por baixo.
 *
 * Parece um detalhe e é o que mais separa uma página amadora de uma
 * profissional. Um `<h2>` solto no meio do branco lê-se como um documento; o
 * mesmo texto com uma marca por baixo lê-se como uma secção de um site.
 */
function TituloSeccao({ children }: { children: ReactNode }) {
  return (
    <div className="mb-10 flex flex-col items-center gap-3 text-center">
      <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">{children}</h2>
      <span className="h-0.5 w-10 rounded-full bg-[var(--site-accent)]" />
    </div>
  );
}

function Photo({ photo, className }: { photo: SitePhoto; className?: string }) {
  // <img> e não next/image: os ficheiros vêm do armazenamento do Supabase em
  // tempo de execução e o otimizador do Next teria de os re-servir a cada
  // visita — custo e latência sem retorno, numa foto que já foi redimensionada
  // no carregamento. Na impressão, o otimizador nem sequer corre.
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={photo.url} alt={photo.alt} className={className} loading="lazy" />;
}

export function SiteRender({
  mode,
  content,
  theme,
  menu,
  isFoodService,
  whatsappNumber,
  whatsappGreeting,
  linkWrapper,
  semente,
}: SiteRenderProps) {
  const whatsapp = whatsappUrl(whatsappNumber, whatsappGreeting ?? undefined);

  /**
   * Desenha um link, com ou sem registo de clique.
   *
   * É uma função chamada, não um componente escrito em JSX, e de propósito:
   * um componente definido aqui dentro ganharia uma identidade nova a cada
   * render e o React desmontava e remontava todos os links da página de cada
   * vez. Uma função devolve o mesmo elemento sem esse custo.
   */
  const link = (props: SiteLinkProps): ReactNode =>
    linkWrapper ? (
      linkWrapper(props)
    ) : (
      <a href={props.href} target="_blank" rel="noopener noreferrer" className={props.className}>
        {props.children}
      </a>
    );

  const sections = new Map<string, MenuItem[]>();
  for (const item of menu) {
    const list = sections.get(item.section) ?? [];
    list.push(item);
    sections.set(item.section, list);
  }

  const accentButton =
    'rounded-lg px-6 py-3 text-base font-semibold bg-[var(--site-accent)] text-[var(--site-on-accent)]';
  /** Em cima da fotografia, o contorno é branco: o acento perde-se no escuro. */
  const heroGhostButton =
    'rounded-lg border border-white/45 bg-white/10 px-5 py-3 text-base font-semibold text-white';

  // Um crédito por fotógrafo, mesmo que a mesma pessoa apareça em três fotos.
  const creditos = [...new Map(
    [content.cover, ...content.gallery]
      .filter((foto): foto is SitePhoto => foto?.credito != null)
      .map((foto) => [foto.credito!, { texto: foto.credito!, url: foto.creditoUrl ?? null }]),
  ).values()];

  const capa: SitePhoto = content.cover ?? {
    url: arteUrl(theme.imagem, semente),
    alt: `Imagem ilustrativa — ${content.hero.headline}`,
  };

  return (
    <div
      style={themeVars(theme, 'light')}
      className="min-h-screen bg-[var(--site-bg)] text-[var(--site-fg)] [font-family:var(--site-font)] print:min-h-0"
    >
      {/* ---------------- Barra de topo ----------------
          Nome à esquerda, telefone à direita. É a barra que faz a página
          parecer um site e não um folheto — e o telefone à vista no topo é o
          que o cliente do comerciante procura primeiro. */}
      <div className="flex items-center justify-between gap-4 border-b border-[var(--site-line)] px-5 py-3.5 sm:px-8">
        <span className="truncate text-sm font-semibold tracking-tight sm:text-base">
          {content.hero.headline}
        </span>
        {content.contact.phoneLabel &&
          (mode === 'print' ? (
            <span className="shrink-0 text-sm font-semibold tabular-nums">
              {content.contact.phoneLabel}
            </span>
          ) : (
            content.contact.phone &&
            link({
              href: `tel:${content.contact.phone}`,
              target: 'phone',
              targetValue: content.contact.phone,
              className:
                'shrink-0 text-sm font-semibold tabular-nums text-[var(--site-accent)] sm:text-base',
              children: content.contact.phoneLabel,
            })
          ))}
      </div>

      {/* ---------------- Herói ----------------
          A fotografia ocupa o ecrã de entrada e o texto vive POR CIMA dela,
          não ao lado. É isso que dá o ar de marca no primeiro segundo — e é
          por isso que uma página sem capa fica com a imagem gerada do ramo:
          uma parede branca não se vende.

          Alturas fixas e nunca `vh`: esta mesma página é desenhada dentro de
          uma moldura para o PDF, onde a altura do ecrã é a do conteúdo todo e
          um herói medido em `vh` ficaria com o tamanho de uma casa. */}
      <Sheet mode={mode}>
        <header className="relative h-[440px] overflow-hidden sm:h-[560px]">
          <Photo photo={capa} className="absolute inset-0 h-full w-full object-cover" />
          {/* O véu escuro garante que o texto branco se lê em CIMA de qualquer
              fotografia que o comerciante mande, clara ou escura. */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/45 via-black/55 to-black/80" />

          <div className="absolute inset-x-0 bottom-0 flex flex-col items-start gap-4 px-6 pb-10 text-white sm:px-10 sm:pb-14">
            {content.hero.badge && (
              <p className="rounded-full border border-white/30 bg-white/15 px-3.5 py-1.5 text-xs font-semibold tracking-wide">
                {content.hero.badge}
              </p>
            )}
            <h1 className="max-w-2xl text-3xl font-semibold tracking-tight text-balance sm:text-5xl">
              {content.hero.headline}
            </h1>
            <p className="max-w-xl text-base text-white/85 sm:text-lg">
              {content.hero.subheadline}
            </p>

            {/* No PDF os botões não se clicam: mostra-se o telefone, que é o
                que o dono vai usar em papel. */}
            {mode === 'print' ? (
              content.contact.phoneLabel && (
                <p className="mt-2 text-2xl font-semibold tabular-nums">
                  {content.contact.phoneLabel}
                </p>
              )
            ) : (
              <div className="mt-2 flex flex-wrap gap-2.5">
                {whatsapp &&
                  link({
                    href: whatsapp,
                    target: 'whatsapp',
                    targetValue: whatsappNumber ?? undefined,
                    className: accentButton,
                    children: isFoodService ? 'Fazer pedido pelo WhatsApp' : 'Falar no WhatsApp',
                  })}
                {content.contact.phone &&
                  link({
                    href: `tel:${content.contact.phone}`,
                    target: 'phone',
                    targetValue: content.contact.phone,
                    className: heroGhostButton,
                    children: 'Ligar agora',
                  })}
                {content.contact.mapsUrl &&
                  link({
                    href: content.contact.mapsUrl,
                    target: 'directions',
                    className: heroGhostButton,
                    children: 'Como chegar',
                  })}
              </div>
            )}
          </div>
        </header>
      </Sheet>

      {/* ---------------- Sobre a casa ---------------- */}
      {content.about && (
        <Sheet mode={mode} className={mode === 'print' ? 'pt-16' : ''}>
          <div className="mx-auto max-w-2xl px-6 py-16">
            <TituloSeccao>Sobre nós</TituloSeccao>
            <p className="text-center text-lg leading-relaxed opacity-80">{content.about}</p>
          </div>
        </Sheet>
      )}

      {/* ---------------- Porquê aqui ----------------
          Três razões, em três colunas, com um número grande e discreto por
          cima. O número não é enfeite: dá âncora ao olho e faz três blocos de
          texto parecerem uma lista pensada em vez de três parágrafos soltos. */}
      {content.highlights.length > 0 && (
        <Sheet mode={mode} className={mode === 'print' ? 'pt-16' : ''}>
          <div className="bg-[var(--site-surface)]">
            <div className="mx-auto max-w-5xl px-6 py-16">
              <TituloSeccao>Porquê aqui</TituloSeccao>
              <div className="grid gap-8 sm:grid-cols-3">
                {content.highlights.map((h, i) => (
                  <div key={h.title} className="flex flex-col items-center gap-2 text-center">
                    <span className="text-sm font-semibold tabular-nums text-[var(--site-accent)]">
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <h3 className="text-lg font-semibold tracking-tight">{h.title}</h3>
                    <p className="text-[0.9375rem] leading-relaxed opacity-70">{h.text}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Sheet>
      )}

      {/* ---------------- O espaço ---------------- */}
      {content.gallery.length > 0 && (
        <Sheet mode={mode} className={mode === 'print' ? 'pt-16' : ''}>
          <div className="mx-auto max-w-5xl px-6 py-16">
            <TituloSeccao>Conheça o espaço</TituloSeccao>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {content.gallery.map((photo) => (
                <Photo
                  key={photo.url}
                  photo={photo}
                  className="aspect-4/3 w-full rounded-xl object-cover"
                />
              ))}
            </div>
          </div>
        </Sheet>
      )}

      {/* ---------------- O que dizem os clientes ----------------
          Avaliações verdadeiras, do Google, com o nome de quem as escreveu e
          a ligação ao perfil. Nada aqui é escrito por nós nem pela IA: a
          página é mostrada ao dono do comércio, que conhece os clientes pelo
          nome. Uma frase inventada acabava a conversa. */}
      {content.reviews.length > 0 && (
        <Sheet mode={mode} className={mode === 'print' ? 'pt-16' : ''}>
          <div className="mx-auto max-w-4xl px-6 pb-16">
            <TituloSeccao>O que dizem os clientes</TituloSeccao>
            <p className="-mt-6 mb-8 text-center text-sm opacity-55">
              Avaliações publicadas no Google
            </p>

            <div className="grid gap-4 sm:grid-cols-2">
              {content.reviews.map((review) => (
                <figure
                  key={`${review.autor}-${review.texto.slice(0, 24)}`}
                  className="flex break-inside-avoid flex-col gap-3 rounded-xl bg-[var(--site-surface)] p-5"
                >
                  {review.nota !== null && (
                    <p className="text-sm tracking-wide text-[var(--site-accent)]">
                      {'★'.repeat(Math.round(review.nota))}
                      <span className="opacity-30">{'★'.repeat(5 - Math.round(review.nota))}</span>
                    </p>
                  )}
                  <blockquote className="text-[0.9375rem] leading-relaxed">
                    {review.texto}
                  </blockquote>
                  <figcaption className="mt-auto text-sm opacity-60">
                    {review.autor}
                    {review.quando && ` · ${review.quando}`}
                  </figcaption>
                </figure>
              ))}
            </div>
          </div>
        </Sheet>
      )}

      {/* ---------------- Cardápio ---------------- */}
      {isFoodService && sections.size > 0 && (
        <Sheet mode={mode} className={mode === 'print' ? 'pt-16' : ''}>
          <div className="mx-auto max-w-2xl px-6 pb-16">
            <TituloSeccao>Cardápio</TituloSeccao>

            {[...sections.entries()].map(([section, items]) => (
              <div key={section} className="mb-9 break-inside-avoid">
                <h3 className="mb-3 border-b border-[var(--site-line)] pb-2 text-sm font-semibold tracking-wide uppercase opacity-60">
                  {section}
                </h3>
                <ul className="flex flex-col">
                  {items.map((item) => {
                    const itemWhatsapp = whatsappUrl(
                      whatsappNumber,
                      `Olá! Queria pedir: ${item.name}`,
                    );

                    return (
                      <li
                        key={item.id}
                        className="flex items-baseline justify-between gap-4 border-b border-[var(--site-line)] py-3 last:border-0"
                      >
                        <div className="min-w-0">
                          <p className="font-medium">
                            {item.name}
                            {!item.is_available && (
                              <span className="ml-2 text-xs opacity-50">(indisponível)</span>
                            )}
                          </p>
                          {item.description && (
                            <p className="mt-0.5 text-sm opacity-60">{item.description}</p>
                          )}
                        </div>
                        <div className="flex shrink-0 items-center gap-3">
                          <span className="font-medium tabular-nums">
                            {formatPrice(item.price_cents, item.currency)}
                          </span>
                          {mode !== 'print' &&
                            itemWhatsapp &&
                            item.is_available &&
                            link({
                              href: itemWhatsapp,
                              target: 'menu_item',
                              targetValue: item.name,
                              menuItemId: item.id,
                              className:
                                'rounded-md bg-[var(--site-accent)] px-2.5 py-1 text-xs font-medium text-[var(--site-on-accent)]',
                              children: 'Pedir',
                            })}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        </Sheet>
      )}

      {/* ---------------- Faixa de fecho ----------------
          A cor do acento a toda a largura, com a chamada e os botões. É o
          ponto da página onde a decisão acontece, e por isso é o único sítio
          em que o acento ocupa tudo em vez de aparecer aos bocadinhos. */}
      <section
        className={`bg-[var(--site-accent)] text-[var(--site-on-accent)] ${
          mode === 'print' ? 'break-inside-avoid' : ''
        }`}
      >
        <div className="mx-auto flex max-w-3xl flex-col items-center gap-4 px-6 py-14 text-center">
          <h2 className="text-2xl font-semibold tracking-tight text-balance sm:text-3xl">
            Fale connosco
          </h2>
          {content.contact.address && (
            <p className="opacity-85">{content.contact.address}</p>
          )}

          {mode === 'print' ? (
            content.contact.phoneLabel && (
              <p className="text-3xl font-semibold tabular-nums">{content.contact.phoneLabel}</p>
            )
          ) : (
            <div className="mt-1 flex flex-wrap justify-center gap-2.5">
              {whatsapp &&
                link({
                  href: whatsapp,
                  target: 'whatsapp',
                  targetValue: whatsappNumber ?? undefined,
                  className:
                    'rounded-lg bg-[var(--site-on-accent)] px-6 py-3 text-base font-semibold text-[var(--site-accent)]',
                  children: 'WhatsApp',
                })}
              {content.contact.phone &&
                link({
                  href: `tel:${content.contact.phone}`,
                  target: 'phone',
                  targetValue: content.contact.phone,
                  className:
                    'rounded-lg border border-current/45 px-6 py-3 text-base font-semibold',
                  children: `Ligar ${content.contact.phoneLabel ?? ''}`.trim(),
                })}
              {content.contact.mapsUrl &&
                link({
                  href: content.contact.mapsUrl,
                  target: 'directions',
                  className:
                    'rounded-lg border border-current/45 px-6 py-3 text-base font-semibold',
                  children: 'Como chegar',
                })}
            </div>
          )}
        </div>
      </section>

      <footer className="flex flex-col items-center gap-1 border-t border-[var(--site-line)] px-6 py-8 text-center text-xs opacity-45">
        <span className="text-sm font-semibold opacity-80">{content.hero.headline}</span>
        {content.contact.locality && <span>{content.contact.locality}</span>}
        {/*
          O crédito das fotografias de banco não é decoração: é a condição da
          licença que permite usá-las numa página comercial. Fica pequeno e no
          fim, como em qualquer site, mas fica.
        */}
        {creditos.length > 0 && (
          <span>
            {creditos.map((credito, i) => (
              <span key={credito.texto}>
                {i > 0 && ' · '}
                {credito.url ? (
                  <a href={credito.url} rel="nofollow noopener" target="_blank" className="underline">
                    {credito.texto}
                  </a>
                ) : (
                  credito.texto
                )}
              </span>
            ))}
          </span>
        )}
      </footer>
    </div>
  );
}
