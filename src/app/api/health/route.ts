import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getServerEnv } from "@/lib/env";

export const dynamic = "force-dynamic";

/**
 * Verificação de saúde: confirma que a aplicação consegue falar com o Supabase
 * e que as migrações foram aplicadas.
 *
 * Usa o cliente de servidor com a chave publishable de propósito — sem sessão, a
 * RLS devolve zero linhas, e é exatamente esse o comportamento correto. O que
 * aqui se testa é a ligação e a existência da tabela, não o conteúdo.
 *
 * Diz também QUAIS das chaves opcionais estão configuradas — sim ou não, nunca
 * o valor. Serve para responder à pergunta que aparece sempre depois de se
 * colar uma chave no painel da Vercel: "ficou lá?". Sem isto, a única maneira
 * de saber é ir tentar usar a funcionalidade e ver se dá erro.
 */
export async function GET() {
  const supabase = await createClient();

  const { error } = await supabase
    .from("businesses")
    .select("id", { count: "exact", head: true });

  if (error) {
    return NextResponse.json(
      {
        error: {
          message: "Não foi possível contactar o Supabase ou a tabela não existe.",
          detail: error.message,
          hint: "Confirma as variáveis de ambiente e corre `npm run db:push`.",
        },
      },
      { status: 503 },
    );
  }

  const env = getServerEnv();

  return NextResponse.json({
    data: {
      status: "ok",
      supabase: "connected",
      // Booleanos e nada mais. O comprimento de uma chave já é informação a
      // mais, e o valor nunca sai daqui em circunstância nenhuma.
      chaves: {
        googlePlaces: Boolean(env.GOOGLE_PLACES_API_KEY),
        anthropic: Boolean(env.ANTHROPIC_API_KEY),
        pexels: Boolean(env.PEXELS_API_KEY),
      },
      checkedAt: new Date().toISOString(),
    },
  });
}
