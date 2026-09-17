import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { loadSite } from '@/lib/sites/load';
import { themeVars } from '@/lib/sites/theme';

/**
 * A página como um ficheiro HTML solto, para descarregar.
 *
 * Serve para levar o site para fora daqui — abrir noutra ferramenta, dar a um
 * programador, ou pedir a outra IA que lhe mexa. Um cliente que pague por um
 * site tem direito a levá-lo consigo, e uma ferramenta que prende o trabalho
 * lá dentro perde a confiança de quem a usa.
 *
 * Só funciona em páginas feitas em modo `html`, e a razão é concreta: essas
 * trazem o seu próprio `<style>` e abrem em qualquer lado. Uma página por
 * campos é desenhada com classes do Tailwind, e exportada sem a folha de
 * estilos sairia texto preto sobre branco — pior do que não exportar.
 *
 * O que está guardado é um fragmento (a partir de `<section>`), já limpo. Aqui
 * embrulha-se num documento completo com a letra e as cores do tema, para o
 * ficheiro abrir igual ao que está no ar.
 */

export const dynamic = 'force-dynamic';

/** Escapa o que vai para dentro de um atributo ou de texto no HTML. */
function escapar(texto: string): string {
  return texto
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Um nome de ficheiro que sobrevive a qualquer sistema. */
function nomeDoFicheiro(titulo: string): string {
  const limpo = titulo
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();

  return `${limpo || 'site'}.html`;
}

export async function GET(_pedido: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return new NextResponse('Entra primeiro.', { status: 401 });

  const { id } = await params;
  const loaded = await loadSite(supabase, id);
  if (!loaded) return new NextResponse('Página não encontrada.', { status: 404 });

  const { site, theme } = loaded;

  if (!site.custom_html) {
    return new NextResponse(
      'Esta página é por campos e não se exporta: o desenho vive na aplicação, e o ficheiro ' +
        'sairia sem estilo nenhum. Gera-a com IA para poderes levá-la.',
      { status: 409 },
    );
  }

  const vars = themeVars(theme, 'light');
  const variaveis = Object.entries(vars)
    .map(([nome, valor]) => `      ${nome}: ${valor};`)
    .join('\n');

  const titulo = site.title ?? 'Site';

  const documento = `<!doctype html>
<html lang="pt">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapar(titulo)}</title>
<style>
  :root {
${variaveis}
  }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; }
  body {
    background: var(--site-bg);
    color: var(--site-fg);
    font-family: var(--site-font);
    -webkit-font-smoothing: antialiased;
  }
  img { max-width: 100%; height: auto; }
</style>
</head>
<body>
${site.custom_html}
</body>
</html>
`;

  return new NextResponse(documento, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      // `attachment` e não `inline`: quem carrega neste botão quer o ficheiro,
      // não quer a página a abrir num separador — para isso já há a
      // pré-visualização.
      'Content-Disposition': `attachment; filename="${nomeDoFicheiro(titulo)}"`,
    },
  });
}
