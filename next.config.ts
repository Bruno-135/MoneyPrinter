import type { NextConfig } from "next";

// Os ficheiros que o painel oferece para descarregar. Sem `attachment`, o
// browser tenta abri-los (o Safari mostra uma pré-visualização ou nada) em vez
// de os guardar.
const PARA_DESCARREGAR = [
  { source: "/vaidesign/marca/proposta.docx", nome: "Proposta VaiDesign.docx" },
  {
    source: "/vaidesign/marca/apresentacao.pptx",
    nome: "Apresentacao VaiDesign.pptx",
  },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  typedRoutes: true,
  async headers() {
    return PARA_DESCARREGAR.map(({ source, nome }) => ({
      source,
      headers: [
        { key: "Content-Disposition", value: `attachment; filename="${nome}"` },
      ],
    }));
  },
};

export default nextConfig;
