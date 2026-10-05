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

  // O aviso por email quando alguém preenche o formulário do site. Opcional
  // pela mesma razão que a chave da Anthropic: sem ela o pedido continua a
  // ser gravado e a aparecer no painel — só não há o toque no telemóvel.
  // Melhor isso do que o site inteiro recusar-se a arrancar.
  RESEND_API_KEY: z.string().min(1).optional(),
  // Para onde vai o aviso. Sem isto, vai para o `geral@` da agência.
  EMAIL_DOS_AVISOS: z.string().email("EMAIL_DOS_AVISOS tem de ser um email válido").optional(),

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

  // Só as fotografias grátis precisam desta, e são um extra: sem ela as
  // páginas continuam a sair inteiras, com as imagens geradas em SVG. É por
  // isso que é opcional — nunca se troca o arranque da aplicação por um
  // acabamento.
  PEXELS_API_KEY: z.string().min(1).optional(),

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
 * Lê do ambiente TODAS as variáveis que o esquema declara.
 *
 * Isto era uma lista escrita à mão, e a lista e o esquema saíram do sítio: a
 * `RESEND_API_KEY` foi declarada em cima e nunca foi lida aqui em baixo. Como
 * é opcional, o `safeParse` não se queixou — ficou `undefined` para sempre.
 * Resultado: a chave estava posta no painel do Vercel, o site enviava pedidos,
 * e o email de aviso nunca saía. Ninguém dava por nada, porque não havia por
 * onde dar: uma variável opcional em falta é exatamente aquilo que uma
 * variável opcional em falta parece.
 *
 * Passa a derivar-se do esquema. Declarar uma variável lá em cima é agora
 * suficiente para ela ser lida, e as duas coisas não podem voltar a divergir.
 *
 * Aqui o acesso dinâmico a `process.env` é seguro, ao contrário do que se faz
 * com as públicas: estas nunca vão ao bundle do browser, portanto não há
 * substituição estática nenhuma a acontecer e `process.env` é um objeto
 * normal com tudo lá dentro.
 *
 * Um valor só com espaços conta como ausente. É o que acontece quando se cola
 * uma chave com um espaço atrás dela num painel web — e uma chave com um
 * espaço não é melhor do que chave nenhuma.
 */
function lerDoAmbiente(): Record<string, string | undefined> {
  const entrada: Record<string, string | undefined> = {};
  for (const chave of Object.keys(serverSchema.shape)) {
    entrada[chave] = process.env[chave]?.trim() || undefined;
  }
  return entrada;
}

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

  const parsed = serverSchema.safeParse(lerDoAmbiente());

  if (!parsed.success) {
    formatIssues("privadas", parsed.error);
  }

  cachedServerEnv = parsed.data;
  return cachedServerEnv;
}
