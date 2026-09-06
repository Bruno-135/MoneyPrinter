import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * Verificação de saúde: confirma que a aplicação consegue falar com o Supabase
 * e que as migrações foram aplicadas.
 *
 * Usa o cliente de servidor com a chave publishable de propósito — sem sessão, a
 * RLS devolve zero linhas, e é exatamente esse o comportamento correto. O que
 * aqui se testa é a ligação e a existência da tabela, não o conteúdo.
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

  return NextResponse.json({
    data: {
      status: "ok",
      supabase: "connected",
      checkedAt: new Date().toISOString(),
    },
  });
}
