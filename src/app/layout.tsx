import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Prospeção Comercial",
  description:
    "Encontra comércios sem site, calcula a probabilidade de venda e gera landing pages de apresentação.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
