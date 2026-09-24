import type { Metadata } from 'next';
import './globals.css';

/**
 * O título que se vê no separador do browser e quando se partilha o endereço.
 *
 * Era "Prospeção Comercial", que servia enquanto isto vivia num endereço da
 * Vercel que só eu conhecia. Agora vive em vaidesign.net, e o separador é a
 * primeira coisa que um cliente lê. As páginas dos clientes em `/s/<código>`
 * têm título próprio e não herdam este.
 */
export const metadata: Metadata = {
  title: { default: 'VaiDesign', template: '%s · VaiDesign' },
  description: 'Sites para comércio local. Feitos em dias, não em meses.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt">
      <head>
        {/* Os tipos de letra do desenho. Carregados por <link> e não por
            `next/font` porque as páginas públicas dos clientes têm tipografia
            própria e não devem arrastar estes dois. */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font --
            A regra é do pages router: no app router um <link> no layout raiz
            vale para todas as páginas, que é exactamente o que se quer. */}
        <link
          href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;700&display=swap"
          rel="stylesheet"
        />
        {/* Corre antes do primeiro desenho. Sem isto, quem escolheu claro via
            o ecrã escuro durante um instante a cada página — o "flash" que
            denuncia que o tema é decidido tarde de mais. */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "try{var t=localStorage.getItem('tema');if(t==='claro'||t==='escuro')document.documentElement.dataset.theme=t==='claro'?'light':'dark'}catch(e){}",
          }}
        />
      </head>
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
