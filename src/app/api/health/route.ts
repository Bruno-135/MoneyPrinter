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
export async function GET(request: Request) {
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
      // Um teste a sério ao banco de imagens, feito no momento e com a
      // resposta em cru. "A chave está configurada" e "a chave funciona" são
      // duas perguntas diferentes, e sem esta segunda a única maneira de
      // distinguir uma da outra era pelos sintomas.
      //
      // Só corre a pedido (`?testar=pexels`) e só para quem tem sessão
      // iniciada: é uma chamada à rede, e uma rota pública que a faça a cada
      // visita é uma maneira de alguém gastar o limite horário desta conta.
      pexels: await testarPexels(request, supabase, env.PEXELS_API_KEY),
      checkedAt: new Date().toISOString(),
    },
  });
}

type ResultadoTeste =
  | { testado: false; porque: string }
  | { testado: true; ok: true; fotos: number }
  | { testado: true; ok: false; estado: number | null; detalhe: string };

async function testarPexels(
  request: Request,
  supabase: Awaited<ReturnType<typeof createClient>>,
  chave: string | undefined,
): Promise<ResultadoTeste> {
  if (new URL(request.url).searchParams.get("testar") !== "pexels") {
    return { testado: false, porque: "Acrescenta ?testar=pexels ao endereço." };
  }

  const { data } = await supabase.auth.getUser();
  if (!data.user) {
    return { testado: false, porque: "É preciso ter sessão iniciada para correr este teste." };
  }

  if (!chave) {
    return { testado: false, porque: "Falta a PEXELS_API_KEY." };
  }

  try {
    const resposta = await fetch(
      "https://api.pexels.com/v1/search?query=bread&per_page=1&orientation=landscape",
      { headers: { Authorization: chave }, cache: "no-store" },
    );

    if (!resposta.ok) {
      // O corpo do erro é do Pexels e nunca contém a chave — o que se manda é
      // o que eles responderam, cortado, para se perceber a razão.
      const corpo = await resposta.text();
      return { testado: true, ok: false, estado: resposta.status, detalhe: corpo.slice(0, 200) };
    }

    const payload = (await resposta.json()) as { photos?: unknown[] };
    return { testado: true, ok: true, fotos: Array.isArray(payload.photos) ? payload.photos.length : 0 };
  } catch (cause) {
    return {
      testado: true,
      ok: false,
      estado: null,
      detalhe: cause instanceof Error ? cause.message : "Erro desconhecido.",
    };
  }
}
