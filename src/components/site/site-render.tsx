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
  const outlineButton =
    'rounded-lg border-2 border-[var(--site-accent)] px-6 py-3 text-base font-semibold text-[var(--site-accent)]';

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
      {/* ---------------- Capa ---------------- */}
      <Sheet mode={mode}>
        {/*
          Uma página sem capa é uma página que começa com uma parede branca, e
          uma parede branca não se vende. Quem não deu fotografia fica com a
          imagem gerada do seu ramo — que não finge ser uma fotografia da loja,
          mas dá cor, altura e um princípio à página.
        */}
        <div className="relative h-56 w-full overflow-hidden sm:h-80">
          <Photo photo={capa} className="h-full w-full object-cover" />
        </div>

        <header className="mx-auto max-w-3xl px-6 pt-16 pb-14 text-center">
          {content.hero.badge && (
            <p className="mb-5 inline-block rounded-full bg-[var(--site-surface)] px-4 py-1.5 text-sm font-medium">
              {content.hero.badge}
            </p>
          )}
          <h1 className="text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
            {content.hero.headline}
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-lg opacity-70">{content.hero.subheadline}</p>

          {/* No PDF os botões não se clicam: mostra-se o telefone, que é o que
              o dono vai usar em papel. */}
          {mode === 'print' ? (
            content.contact.phoneLabel && (
              <p className="mt-8 text-2xl font-semibold tabular-nums">
                {content.contact.phoneLabel}
              </p>
            )
          ) : (
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              {isFoodService &&
                whatsapp &&
                link({
                  href: whatsapp,
                  target: 'whatsapp',
                  targetValue: whatsappNumber ?? undefined,
                  className: accentButton,
                  children: 'Fazer pedido pelo WhatsApp',
                })}
              {content.contact.phone &&
                link({
                  href: `tel:${content.contact.phone}`,
                  target: 'phone',
                  targetValue: content.contact.phone,
                  className: outlineButton,
                  children: `Ligar ${content.contact.phoneLabel ?? content.contact.phone}`,
                })}
            </div>
          )}
        </header>
      </Sheet>

      {/* ---------------- Sobre, destaques e galeria ---------------- */}
      {(content.about || content.highlights.length > 0 || content.gallery.length > 0) && (
        <Sheet mode={mode} className={mode === 'print' ? 'pt-16' : ''}>
          {content.about && (
            <div className="mx-auto max-w-2xl px-6 pb-14">
              <p className="text-center text-lg leading-relaxed opacity-80">{content.about}</p>
            </div>
          )}

          {content.highlights.length > 0 && (
            <div className="mx-auto grid max-w-4xl gap-6 px-6 pb-16 sm:grid-cols-3">
              {content.highlights.map((h) => (
                <div key={h.title} className="rounded-xl bg-[var(--site-surface)] p-6">
                  <h2 className="font-semibold">{h.title}</h2>
                  <p className="mt-2 text-sm opacity-70">{h.text}</p>
                </div>
              ))}
            </div>
          )}

          {content.gallery.length > 0 && (
            <div className="mx-auto grid max-w-4xl grid-cols-2 gap-3 px-6 pb-16 sm:grid-cols-3">
              {content.gallery.map((photo) => (
                <Photo
                  key={photo.url}
                  photo={photo}
                  className="aspect-4/3 w-full rounded-lg object-cover"
                />
              ))}
            </div>
          )}
        </Sheet>
      )}

      {/* ---------------- Cardápio ---------------- */}
      {isFoodService && sections.size > 0 && (
        <Sheet mode={mode} className={mode === 'print' ? 'pt-16' : ''}>
          <div className="mx-auto max-w-2xl px-6 pb-16">
            <h2 className="mb-8 text-center text-2xl font-semibold tracking-tight">Cardápio</h2>

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

      {/* ---------------- Contactos ---------------- */}
      <section
        className={`border-t border-[var(--site-line)] ${mode === 'print' ? 'break-inside-avoid pt-16' : ''}`}
      >
        <div className="mx-auto flex max-w-2xl flex-col items-center gap-3 px-6 py-14 text-center">
          <h2 className="text-2xl font-semibold tracking-tight">Onde nos encontra</h2>
          {content.contact.address && <p className="opacity-70">{content.contact.address}</p>}

          {mode === 'print' ? (
            <div className="mt-3 flex flex-col gap-1">
              {content.contact.phoneLabel && (
                <p className="text-lg font-semibold tabular-nums">{content.contact.phoneLabel}</p>
              )}
              {content.contact.mapsUrl && (
                <p className="text-sm break-all opacity-55">{content.contact.mapsUrl}</p>
              )}
            </div>
          ) : (
            <div className="mt-3 flex flex-wrap justify-center gap-3">
              {content.contact.mapsUrl &&
                link({
                  href: content.contact.mapsUrl,
                  target: 'directions',
                  className: 'rounded-lg border border-[var(--site-line)] px-5 py-2.5 font-medium',
                  children: 'Como chegar',
                })}
              {whatsapp &&
                link({
                  href: whatsapp,
                  target: 'whatsapp',
                  className:
                    'rounded-lg bg-[var(--site-accent)] px-5 py-2.5 font-medium text-[var(--site-on-accent)]',
                  children: 'WhatsApp',
                })}
            </div>
          )}
        </div>
      </section>

      <footer className="flex flex-col items-center gap-1 pb-10 text-center text-xs opacity-40">
        <span>{content.hero.headline}</span>
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
