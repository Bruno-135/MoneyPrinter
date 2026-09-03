export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center gap-6 px-6 py-16">
      <div>
        <p className="text-sm font-medium tracking-wide text-brand-600 uppercase">Etapa 1</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Prospeção Comercial</h1>
        <p className="mt-3 text-base opacity-70">
          Estrutura do projeto, ligação ao Supabase e schema da base de dados em migrações SQL.
        </p>
      </div>

      <ul className="space-y-2 text-sm opacity-80">
        <li>&#10003; Next.js (App Router) + TypeScript + Tailwind</li>
        <li>&#10003; Clientes Supabase separados: browser, servidor e service role</li>
        <li>&#10003; Variáveis de ambiente públicas e privadas separadas e validadas</li>
        <li>&#10003; Nove tabelas com dono, RLS e histórico de negociação</li>
      </ul>

      <p className="text-sm opacity-60">
        Estado da ligação em{" "}
        <a className="text-brand-600 underline underline-offset-4" href="/api/health">
          /api/health
        </a>
        .
      </p>
    </main>
  );
}
