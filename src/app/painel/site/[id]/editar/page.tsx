import Link from 'next/link';
import type { Route } from 'next';
import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { loadSite } from '@/lib/sites/load';
import { FONTS, FONT_IDS, PALETTES, PALETTE_IDS } from '@/lib/sites/theme';
import { saveSiteContent, detachPhoto } from '../../site-edit-actions';
import { PhotoUpload } from './photo-upload';

/**
 * Editor da landing page.
 *
 * Os campos deste formulário SÃO o formato do conteúdo. Não é uma coincidência
 * de nomes: a geração automática, o que aqui se escreve à mão e — na fase
 * seguinte — o que a IA produzir a partir de uma frase escrevem todos no mesmo
 * sítio. É por isso que este ecrã se fez antes da IA: sem ele, a IA teria de
 * inventar uma estrutura que depois seria preciso refazer.
 *
 * Formulário simples com ação de servidor, sem estado no cliente. Uma página
 * que se guarda com um botão é mais fácil de perceber — e de recuperar quando
 * corre mal — do que uma que grava sozinha enquanto se escreve.
 */

export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{ id: string }>;
}

const field =
  'rounded-md border border-black/15 bg-white/60 px-3 py-2 text-base outline-none focus:border-brand-500 dark:border-white/15 dark:bg-white/5';

export default async function EditarSitePage({ params }: Props) {
  const { id } = await params;

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect('/entrar');

  const loaded = await loadSite(supabase, id);
  if (!loaded) notFound();

  const { site, content, theme, isFoodService } = loaded;

  // Três lugares fixos para os destaques. Um número variável exigiria estado no
  // cliente para acrescentar e remover linhas; três cartões é o que o desenho
  // da página mostra, e deixar um em branco já serve para o esconder.
  const highlights = [0, 1, 2].map((i) => content.highlights[i] ?? { title: '', text: '' });

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-8 px-6 py-12">
      <div>
        <Link
          href={`/painel/site/${id}/previa`}
          className="text-sm underline underline-offset-4 opacity-60"
        >
          &larr; Voltar à pré-visualização
        </Link>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight">Editar página</h1>
        <p className="mt-1 opacity-65">
          O que mudares aqui aparece na pré-visualização e no PDF. Se a página já estiver no ar,
          muda também para quem a abrir.
        </p>
      </div>

      {/* ---------------- Fotografias ----------------
          Fora do formulário principal de propósito: cada foto grava-se sozinha
          quando é carregada, e obrigar a carregar em "Guardar" a seguir seria
          uma forma fácil de as perder. */}
      <section className="flex flex-col gap-5 rounded-lg border border-black/10 p-5 dark:border-white/10">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Fotografias</h2>
          <p className="mt-1 text-sm opacity-60">
            Peça-as ao dono do comércio. Não se usam as fotos do Google: têm licença própria e
            estas páginas são vendidas.
          </p>
          <p className="mt-2 text-sm">
            <Link
              href={`/painel/site/${id}/imagens` as Route}
              className="underline underline-offset-4 opacity-80"
            >
              Enquanto ele não as dá &rarr; fotografias grátis e imagem gerada
            </Link>
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <p className="text-sm font-medium">Capa</p>
          {content.cover ? (
            <div className="flex flex-wrap items-start gap-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={content.cover.url}
                alt={content.cover.alt}
                className="h-28 w-44 rounded-md object-cover"
              />
              <form action={detachPhoto}>
                <input type="hidden" name="siteId" value={id} />
                <input type="hidden" name="url" value={content.cover.url} />
                <button type="submit" className="text-sm text-red-600 dark:text-red-400">
                  Remover
                </button>
              </form>
            </div>
          ) : (
            <PhotoUpload
              siteId={id}
              ownerId={auth.user.id}
              slot="cover"
              label="Escolher foto de capa"
            />
          )}
        </div>

        <div className="flex flex-col gap-3 border-t border-black/10 pt-5 dark:border-white/10">
          <p className="text-sm font-medium">Galeria</p>
          {content.gallery.length > 0 && (
            <ul className="flex flex-wrap gap-3">
              {content.gallery.map((photo) => (
                <li key={photo.url} className="flex flex-col gap-1.5">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={photo.url}
                    alt={photo.alt}
                    className="h-24 w-32 rounded-md object-cover"
                  />
                  <form action={detachPhoto}>
                    <input type="hidden" name="siteId" value={id} />
                    <input type="hidden" name="url" value={photo.url} />
                    <button type="submit" className="text-xs text-red-600 dark:text-red-400">
                      Remover
                    </button>
                  </form>
                </li>
              ))}
            </ul>
          )}
          <PhotoUpload
            siteId={id}
            ownerId={auth.user.id}
            slot="gallery"
            label="Acrescentar à galeria"
          />
        </div>
      </section>

      {/* ---------------- Texto e aparência ---------------- */}
      <form action={saveSiteContent} className="flex flex-col gap-8">
        <input type="hidden" name="siteId" value={id} />

        <section className="flex flex-col gap-4 rounded-lg border border-black/10 p-5 dark:border-white/10">
          <h2 className="text-lg font-semibold tracking-tight">Capa</h2>

          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">Nome do comércio</span>
            <input name="headline" defaultValue={content.hero.headline} className={field} />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">Frase por baixo</span>
            <input
              name="subheadline"
              defaultValue={content.hero.subheadline}
              placeholder="Padaria em Braga · pão cozido todos os dias"
              className={field}
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">Selo</span>
            <input
              name="badge"
              defaultValue={content.hero.badge ?? ''}
              placeholder="4,6★ · 227 avaliações no Google"
              className={field}
            />
            <span className="text-xs opacity-55">Deixa vazio para não aparecer.</span>
          </label>
        </section>

        <section className="flex flex-col gap-4 rounded-lg border border-black/10 p-5 dark:border-white/10">
          <h2 className="text-lg font-semibold tracking-tight">Sobre</h2>
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">Texto de apresentação</span>
            <textarea name="about" rows={5} defaultValue={content.about} className={field} />
            <span className="text-xs opacity-55">
              O texto gerado é propositadamente vago porque não sabemos a história da casa.
              Pergunta ao dono há quanto tempo abriu e o que faz melhor — e escreve isso aqui.
            </span>
          </label>
        </section>

        <section className="flex flex-col gap-5 rounded-lg border border-black/10 p-5 dark:border-white/10">
          <div>
            <h2 className="text-lg font-semibold tracking-tight">Destaques</h2>
            <p className="mt-1 text-sm opacity-60">
              Três cartões. Deixa o título vazio para esconder um deles.
            </p>
          </div>

          {highlights.map((highlight, i) => (
            <div key={i} className="flex flex-col gap-2.5">
              <input
                name={`highlightTitle${i}`}
                defaultValue={highlight.title}
                placeholder={`Título do destaque ${i + 1}`}
                className={field}
              />
              <textarea
                name={`highlightText${i}`}
                rows={2}
                defaultValue={highlight.text}
                placeholder="Uma ou duas frases"
                className={field}
              />
            </div>
          ))}
        </section>

        <section className="flex flex-col gap-4 rounded-lg border border-black/10 p-5 dark:border-white/10">
          <h2 className="text-lg font-semibold tracking-tight">Contactos</h2>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium">Telefone para ligar</span>
              <input
                name="phone"
                defaultValue={content.contact.phone ?? ''}
                placeholder="+351253693224"
                className={field}
              />
              <span className="text-xs opacity-55">Com indicativo do país, sem espaços.</span>
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium">Telefone como aparece</span>
              <input
                name="phoneLabel"
                defaultValue={content.contact.phoneLabel ?? ''}
                placeholder="253 693 224"
                className={field}
              />
              <span className="text-xs opacity-55">
                O que o visitante lê. Vazio usa o de cima.
              </span>
            </label>
          </div>

          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">Morada</span>
            <input name="address" defaultValue={content.contact.address ?? ''} className={field} />
          </label>

          {isFoodService && (
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium">Mensagem do pedido por WhatsApp</span>
              <input
                name="whatsappGreeting"
                defaultValue={site.whatsapp_greeting ?? ''}
                className={field}
              />
              <span className="text-xs opacity-55">
                É o texto que já vem escrito quando o cliente abre o WhatsApp.
              </span>
            </label>
          )}
        </section>

        {/* ---------------- Aparência ---------------- */}
        <section className="flex flex-col gap-5 rounded-lg border border-black/10 p-5 dark:border-white/10">
          <div>
            <h2 className="text-lg font-semibold tracking-tight">Aparência</h2>
            <p className="mt-1 text-sm opacity-60">
              Guarda e vê o resultado na pré-visualização.
            </p>
          </div>

          <fieldset className="flex flex-col gap-3">
            <legend className="mb-2 text-sm font-medium">Cores</legend>
            <div className="grid gap-2.5 sm:grid-cols-2">
              {PALETTE_IDS.map((paletteId) => {
                const palette = PALETTES[paletteId];
                return (
                  <label
                    key={paletteId}
                    className="flex cursor-pointer items-start gap-3 rounded-md border border-black/12 p-3 has-checked:border-brand-500 has-checked:bg-brand-50/60 dark:border-white/12 dark:has-checked:bg-white/5"
                  >
                    <input
                      type="radio"
                      name="palette"
                      value={paletteId}
                      defaultChecked={theme.palette === paletteId}
                      className="mt-1"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2">
                        <span className="font-medium">{palette.label}</span>
                        <span className="flex gap-1" aria-hidden="true">
                          {[palette.light.bg, palette.light.surface, palette.light.accent].map(
                            (color) => (
                              <span
                                key={color}
                                style={{ background: color }}
                                className="h-4 w-4 rounded-full border border-black/15"
                              />
                            ),
                          )}
                        </span>
                      </span>
                      <span className="mt-0.5 block text-xs opacity-60">{palette.suits}</span>
                    </span>
                  </label>
                );
              })}
            </div>
          </fieldset>

          <fieldset className="flex flex-col gap-3 border-t border-black/10 pt-5 dark:border-white/10">
            <legend className="mb-2 text-sm font-medium">Tipo de letra</legend>
            <div className="grid gap-2.5 sm:grid-cols-3">
              {FONT_IDS.map((fontId) => (
                <label
                  key={fontId}
                  className="flex cursor-pointer items-start gap-3 rounded-md border border-black/12 p-3 has-checked:border-brand-500 has-checked:bg-brand-50/60 dark:border-white/12 dark:has-checked:bg-white/5"
                >
                  <input
                    type="radio"
                    name="font"
                    value={fontId}
                    defaultChecked={theme.font === fontId}
                    className="mt-1"
                  />
                  <span className="min-w-0 flex-1">
                    <span
                      style={{ fontFamily: FONTS[fontId].stack }}
                      className="block font-medium"
                    >
                      {FONTS[fontId].label}
                    </span>
                    <span className="mt-0.5 block text-xs opacity-60">{FONTS[fontId].suits}</span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
        </section>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="submit"
            className="rounded-md bg-brand-600 px-5 py-2.5 font-medium text-white"
          >
            Guardar
          </button>
          <Link
            href={`/painel/site/${id}/previa`}
            className="rounded-md border border-black/15 px-5 py-2.5 font-medium dark:border-white/15"
          >
            Ver como fica
          </Link>
        </div>
      </form>
    </main>
  );
}
