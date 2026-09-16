import Link from 'next/link';
import type { Route } from 'next';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { TEMPLATES } from '@/lib/sites/templates';
import { PALETTES, FONTS } from '@/lib/sites/theme';
import { STYLES } from '@/lib/sites/style';
import { findCategory } from '@/lib/places/categories';
import { SECTION_LABELS } from '@/lib/sites/sections';

/**
 * A biblioteca de modelos.
 *
 * Serve duas coisas, e a segunda é a que dá dinheiro: escolher o modelo antes
 * de gerar um site, e MOSTRAR ao comerciante o que ele vai ter antes de dizer
 * o preço. Um cliente que escolhe entre três desenhos já decidiu comprar —
 * está só a decidir qual.
 *
 * Cada cartão mostra as cores a sério, em quadradinhos: é o que se vê ao
 * primeiro olhar, e é por aí que uma pessoa escolhe.
 */

export const dynamic = 'force-dynamic';

export default async function ModelosPage() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect('/entrar');

  return (
    <>
      <p className="max-w-[62ch] text-[13px] text-ink2">
        {TEMPLATES.length} modelos. Abre um para o ver por inteiro, como o comerciante o vai ver —
        é essa página que se mostra ao telefone antes de dizer o preço.
      </p>

      <ul className="grid gap-3 [grid-template-columns:repeat(auto-fill,minmax(280px,1fr))]">
        {TEMPLATES.map((t) => {
          const paleta = PALETTES[t.palette];
          const ramo = t.category ? findCategory(t.category) : null;

          return (
            <li key={t.id}>
              <Link
                href={`/painel/modelos/${t.id}` as Route}
                className="flex h-full flex-col overflow-hidden rounded-2xl border border-line bg-surf transition-colors hover:border-acc/50"
              >
                {/* As cores como amostra, na proporção em que aparecem na
                    página: o fundo domina, o acento é uma gota. */}
                <div className="flex h-20" style={{ background: paleta.light.bg }}>
                  <div className="flex-1" />
                  <div className="w-1/5" style={{ background: paleta.light.surface }} />
                  <div className="w-[8%]" style={{ background: paleta.light.accent }} />
                </div>

                <div className="flex flex-1 flex-col gap-2 p-3.5">
                  <span className="text-[15px] font-bold">{t.name}</span>
                  <span className="text-[13px] text-ink2">{t.description}</span>

                  <div className="mt-auto flex flex-wrap gap-1.5 pt-2">
                    <Marca>{STYLES[t.style].label}</Marca>
                    <Marca>{paleta.label}</Marca>
                    <Marca>{FONTS[t.font].label}</Marca>
                    {ramo && <Marca>{ramo.label}</Marca>}
                  </div>

                  <span className="font-mono text-[10px] tracking-wide text-ink3">
                    {t.sections.map((s) => SECTION_LABELS[s]).join(' · ')}
                  </span>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </>
  );
}

function Marca({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full border border-line px-2 py-0.5 font-mono text-[10px] tracking-wide text-ink2 uppercase">
      {children}
    </span>
  );
}
