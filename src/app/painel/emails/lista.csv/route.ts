import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { lerQuemSou } from '@/lib/equipa/quem-sou';
import { podeEntrar } from '@/lib/equipa/permissoes';
import { folha } from '@/lib/emails/repository';
import { ETIQUETA_DO_EMAIL, ehEstadoDoEmail } from '@/lib/emails/estado-do-email';
import { nomeDoPais } from '@/lib/places/paises';
import { nomeDoFicheiro, paraCsv } from '@/lib/exportar/csv';

/**
 * A folha de e-mails, para abrir no Excel. Leva o que está no ecrã: o mesmo
 * filtro, a mesma procura, a mesma ordem.
 */

export const dynamic = 'force-dynamic';

const MAXIMO = 5000;

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ erro: 'Sessão expirada.' }, { status: 401 });

  // Uma rota é um endereço como outro qualquer: ter sessão não chega, é preciso
  // a área dos e-mails. Fechar a página não fecha esta porta.
  const quem = await lerQuemSou();
  if (!quem || !podeEntrar(quem.permissoes, 'emails')) {
    return NextResponse.json({ erro: 'Sem acesso aos e-mails.' }, { status: 403 });
  }

  const p = new URL(request.url).searchParams;
  const pedido = p.get('estado');

  const { linhas } = await folha(supabase, {
    estado: ehEstadoDoEmail(pedido) ? pedido : null,
    procura: p.get('q') ?? '',
    ordem: p.get('ordem') === 'nome' ? 'nome' : 'novos',
    de: 0,
    quantos: MAXIMO,
  });

  const colunas = [
    'Lead',
    'E-mail',
    'Estado do e-mail',
    'Origem',
    'Site',
    'Cidade',
    'País',
    'Extraído em',
  ];
  const ORIGEM: Record<string, string> = { site: 'Site', mao: 'À mão' };

  const dados = linhas.map((l) => [
    l.nome,
    l.email ?? '',
    ETIQUETA_DO_EMAIL[l.estado],
    l.origem ? (ORIGEM[l.origem] ?? '') : '',
    l.site ?? '',
    l.cidade ?? '',
    nomeDoPais(l.pais),
    l.vistoEm ? l.vistoEm.slice(0, 10) : '',
  ]);

  return new NextResponse(paraCsv(colunas, dados), {
    headers: {
      'content-type': 'text/csv; charset=utf-8',
      'content-disposition': `attachment; filename="${nomeDoFicheiro('emails dos leads')}"`,
      'cache-control': 'no-store',
    },
  });
}
