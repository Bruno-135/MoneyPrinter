/**
 * O e-mail, do texto que se escreve ao que sai.
 *
 * O texto leva marcadores — `{nome}`, `{cidade}` — que se trocam pelos dados
 * de cada lead. A regra que importa: um marcador SEM valor nunca sai. Um
 * e-mail a dizer «Olá, encontrei a {nome} em {cidade}» é o erro mais
 * reconhecível de mensagem em massa, e custa a resposta e a reputação do
 * domínio. Se falta um dado, o lead é posto de lado e diz-se porquê.
 */

export const MARCADORES = [
  { nome: 'nome', explica: 'o nome do negócio, como está no Google' },
  { nome: 'cidade', explica: 'a cidade do negócio' },
] as const;

const CONHECIDOS = new Set<string>(MARCADORES.map((m) => m.nome));

export type Dados = Record<string, string | null | undefined>;

export type Preenchido = { ok: true; texto: string } | { ok: false; faltam: string[] };

/** Os marcadores que o texto usa, sem repetir. */
export function marcadoresUsados(texto: string): string[] {
  return [...new Set([...texto.matchAll(/\{([^{}\n]+)\}/g)].map((m) => m[1]!))];
}

/** Os que o texto usa e não existem — quase sempre uma gralha: `{Nome}`, `{cidade }`. */
export function marcadoresDesconhecidos(texto: string): string[] {
  return marcadoresUsados(texto).filter((m) => !CONHECIDOS.has(m));
}

export function preencher(texto: string, dados: Dados): Preenchido {
  const faltam = marcadoresUsados(texto).filter((m) => !dados[m]?.trim());
  if (faltam.length > 0) return { ok: false, faltam };
  return {
    ok: true,
    texto: texto.replace(/\{([^{}\n]+)\}/g, (_, m: string) => dados[m]!.trim()),
  };
}

export function dadosDoLead(lead: { name: string; locality: string | null }): Dados {
  return { nome: lead.name, cidade: lead.locality };
}

function escapar(v: string): string {
  return v
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Quem enviou, porquê, e como sair. Vai em TODOS os e-mails, sem exceção e
 * sem maneira de a tirar do texto: o corpo é do utilizador, o rodapé não.
 */
export function rodape(ligacaoParaSair: string): string {
  return [
    'Recebeu este e-mail porque o contacto da sua empresa é público. Escrevemos só uma vez, sem insistir.',
    `Se não quiser receber mais mensagens da VaiDesign: ${ligacaoParaSair}`,
  ].join('\n');
}

export interface Montado {
  assunto: string;
  texto: string;
  html: string;
}

/** O que segue para o Resend: assunto, versão em texto e versão em HTML. */
export function montar(assunto: string, corpo: string, ligacaoParaSair: string): Montado {
  const nota = rodape(ligacaoParaSair);
  const paragrafos = corpo
    .trim()
    .split(/\n{2,}/)
    .map((p) => `<p style="margin:0 0 14px">${escapar(p).replace(/\n/g, '<br>')}</p>`)
    .join('');
  const linhaUm = nota.split('\n')[0]!;

  const html =
    `<div style="max-width:560px;font:400 15px/1.6 system-ui,Arial,sans-serif;color:#141210">` +
    paragrafos +
    `<p style="margin:28px 0 0;padding-top:14px;border-top:1px solid #ddd;font-size:12px;color:#6b6259">` +
    `${escapar(linhaUm)}<br>` +
    `Se não quiser receber mais mensagens da VaiDesign: ` +
    `<a href="${escapar(ligacaoParaSair)}" style="color:#6b6259">cancelar</a></p></div>`;

  return { assunto, texto: `${corpo.trim()}\n\n--\n${nota}\n`, html };
}
