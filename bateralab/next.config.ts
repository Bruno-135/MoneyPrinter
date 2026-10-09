import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // O BateraLab vive num subdiretório de um repositório com outros projetos:
  // fixar a raiz evita que o Next/Turbopack apanhe arquivos do projeto pai.
  turbopack: { root: __dirname },
  outputFileTracingRoot: __dirname,
};

export default nextConfig;
