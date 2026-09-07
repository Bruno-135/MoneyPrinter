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
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(1, "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY é obrigatória"),
  NEXT_PUBLIC_SITE_URL: z.string().url("NEXT_PUBLIC_SITE_URL tem de ser um URL válido"),
});

/**
 * Só é obrigatório o que a aplicação web precisa mesmo para funcionar.
 *
 * O resto é opcional de propósito: cada variável obrigatória a mais é mais uma
 * coisa que alguém tem de ir buscar e colar num painel, e mais uma maneira de o
 * arranque falhar. Quem precisa das opcionais valida-as no momento em que as
 * usa, com uma mensagem que diz exatamente o que falta e para quê.
 */
const serverSchema = z.object({
  // Obrigatória: sem ela não há varrimento nenhum.
  GOOGLE_PLACES_API_KEY: z.string().min(1, "GOOGLE_PLACES_API_KEY é obrigatória"),

  // Só a linha de comandos (`npm run scan`, `npm run list`) precisa destas.
  // Na aplicação web quem procura é o utilizador com sessão iniciada.
  PROSPECTOR_EMAIL: z.string().email("PROSPECTOR_EMAIL tem de ser um email válido").optional(),
  PROSPECTOR_PASSWORD: z.string().min(1).optional(),

  // Só a rota POST /api/scan precisa deste. Sem ele, a rota recusa-se a
  // funcionar em vez de ficar aberta ao mundo.
  SCAN_API_SECRET: z.string().min(16, "SCAN_API_SECRET tem de ter pelo menos 16 caracteres").optional(),

  // Só tarefas de sistema precisam desta. Nada no caminho normal a usa.
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),

  // Só a geração de páginas por IA precisa desta. Opcional de propósito: sem
  // ela, tudo o resto continua a funcionar — o varrimento, a lista, o editor,
  // o PDF — e só o botão de gerar por IA diz que falta a chave. Torná-la
  // obrigatória faria a aplicação inteira recusar-se a arrancar por causa de
  // uma funcionalidade que se pode dispensar.
  //
  // Não se valida o formato, e isso é uma correção deliberada a uma versão
  // anterior deste ficheiro. Tinha aqui uma regra a exigir que a chave
  // começasse por "sk-ant-", escrita de cor. Uma chave real que não batia
  // certo com esse palpite fez o esquema falhar — e como isto corre no
  // arranque, o ecrã inteiro devolvia 500 em vez de a funcionalidade avisar
  // que não estava configurada.
  //
  // Duas lições, as duas gravadas aqui: quem decide se uma chave é válida é a
  // API que a recebe, não um palpite sobre prefixos; e uma variável OPCIONAL
  // mal preenchida tem de degradar a sua funcionalidade, nunca derrubar o
  // resto da aplicação.
  ANTHROPIC_API_KEY: z.string().min(1).optional(),

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
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
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
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || undefined,
    ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY?.trim() || undefined,
    GOOGLE_PLACES_API_KEY: process.env.GOOGLE_PLACES_API_KEY,
    PROSPECTOR_EMAIL: process.env.PROSPECTOR_EMAIL || undefined,
    PROSPECTOR_PASSWORD: process.env.PROSPECTOR_PASSWORD || undefined,
    SCAN_API_SECRET: process.env.SCAN_API_SECRET || undefined,
    PUBLIC_SITE_DEFAULT_TTL_DAYS: process.env.PUBLIC_SITE_DEFAULT_TTL_DAYS || undefined,
    REGION_SEARCH_CACHE_DAYS: process.env.REGION_SEARCH_CACHE_DAYS || undefined,
  });

  if (!parsed.success) {
    formatIssues("privadas", parsed.error);
  }

  cachedServerEnv = parsed.data;
  return cachedServerEnv;
}
