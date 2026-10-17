import type { Metadata, Viewport } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "BateraLab", template: "%s · BateraLab" },
  description: "Estude bateria com partitura sincronizada e bateria virtual.",
};

export const viewport: Viewport = {
  themeColor: "#09090b",
  colorScheme: "dark",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className="dark">
      <body className="min-h-dvh antialiased">
        <header className="border-b border-zinc-900">
          <nav className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
            <Link href="/" className="text-lg font-bold tracking-tight">
              Batera<span className="text-sky-400">Lab</span>
            </Link>
            <div className="flex gap-4 text-sm text-zinc-400">
              <Link href="/" className="hover:text-zinc-100">Exercícios</Link>
              <Link href="/upload" className="hover:text-zinc-100">Enviar música</Link>
            </div>
          </nav>
        </header>
        <main className="mx-auto max-w-7xl px-4 py-6">{children}</main>
      </body>
    </html>
  );
}
