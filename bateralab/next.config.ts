import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // O BateraLab vive num subdiretório de um repositório com outros projetos:
  // fixar a raiz evita que o Next/Turbopack apanhe arquivos do projeto pai.
  turbopack: { root: __dirname },
  outputFileTracingRoot: __dirname,
  // Endereços dos primeiros exercícios (antes do catálogo da escola).
  async redirects() {
    return [
      ["01-rock-basico", "rock-basico"],
      ["02-rock-semicolcheias", "rock-semicolcheias"],
      ["03-chimbal-aberto", "disco-chimbal-aberto"],
      ["04-virada-tons", "virada-tons"],
    ].map(([from, to]) => ({ source: `/exercicios/${from}`, destination: `/exercicios/${to}`, permanent: true }));
  },
};

export default nextConfig;
