import { z } from "zod";

/**
 * Validação das variáveis de ambiente.
 *
 * As variáveis estão separadas em dois grupos por uma razão de segurança:
 *
 *  - `publicEnv`  — prefixadas com `NEXT_PUBLIC_`, embutidas no bundle do browser.
 *  - `serverEnv`  — só existem no servidor. Aceder a elas a partir de código de
 *                   browser lança um erro em vez de devolver `undefined`
 *                   silenciosamente.
 *
 * A validação corre no momento do import, portanto uma variável em falta rebenta
 * no arranque e não a meio de um pedido em produção.
 */

const publicSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url("NEXT_PUBLIC_SUPABASE_URL tem de ser um URL válido"),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1, "NEXT_PUBLIC_SUPABASE_ANON_KEY é obrigatória"),
  NEXT_PUBLIC_SITE_URL: z.string().url("NEXT_PUBLIC_SITE_URL tem de ser um URL válido"),
});

const serverSchema = z.object({
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, "SUPABASE_SERVICE_ROLE_KEY é obrigatória"),
  GOOGLE_PLACES_API_KEY: z.string().min(1, "GOOGLE_PLACES_API_KEY é obrigatória"),
  PUBLIC_SITE_DEFAULT_TTL_DAYS: z.coerce.number().int().positive().default(30),
  REGION_SEARCH_CACHE_DAYS: z.coerce.number().int().positive().default(30),
});

export type PublicEnv = z.infer<typeof publicSchema>;
export type ServerEnv = z.infer<typeof serverSchema>;

function formatIssues(context: string, error: z.ZodError): never {
  const details = error.issues.map((issue) => `  - ${issue.path.join(".")}: ${issue.message}`).join("\n");
  throw new Error(
    `Variáveis de ambiente inválidas (${context}):\n${details}\n\n` +
      "Copia .env.local.example para .env.local e preenche os valores em falta.",
  );
}

/**
 * Referências literais e completas a `process.env.X` — o Next.js só substitui
 * as variáveis `NEXT_PUBLIC_*` no bundle quando o acesso é escrito assim.
 * Um acesso dinâmico (`process.env[nome]`) devolveria `undefined` no browser.
 */
const parsedPublic = publicSchema.safeParse({
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
});

if (!parsedPublic.success) {
  formatIssues("públicas", parsedPublic.error);
}

export const publicEnv: PublicEnv = parsedPublic.data;

let cachedServerEnv: ServerEnv | null = null;

/**
 * Variáveis privadas. Só pode ser chamada em código de servidor
 * (Server Components, Route Handlers, Server Actions, jobs).
 */
export function getServerEnv(): ServerEnv {
  if (typeof window !== "undefined") {
    throw new Error(
      "getServerEnv() foi chamada no browser. As variáveis privadas nunca podem chegar ao cliente.",
    );
  }

  if (cachedServerEnv) {
    return cachedServerEnv;
  }

  const parsed = serverSchema.safeParse({
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    GOOGLE_PLACES_API_KEY: process.env.GOOGLE_PLACES_API_KEY,
    PUBLIC_SITE_DEFAULT_TTL_DAYS: process.env.PUBLIC_SITE_DEFAULT_TTL_DAYS || undefined,
    REGION_SEARCH_CACHE_DAYS: process.env.REGION_SEARCH_CACHE_DAYS || undefined,
  });

  if (!parsed.success) {
    formatIssues("privadas", parsed.error);
  }

  cachedServerEnv = parsed.data;
  return cachedServerEnv;
}
