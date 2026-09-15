import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Prospeção Comercial',
  description:
    'Encontra comércios sem site, calcula a probabilidade de venda e gera landing pages de apresentação.',
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
