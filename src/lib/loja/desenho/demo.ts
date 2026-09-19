/**
 * Os dados de exemplo do desenho, trocados pelos do comerciante.
 *
 * Nem tudo no desenho é `{{ }}`: a morada, o email, o telefone e o nome da
 * loja estão escritos à mão no rodapé e na página de contacto, porque num
 * artboard isso é conteúdo e não campo. Num site a sério é o contrário — e sem
 * esta troca a loja da Mifalda Kids mostrava "Volta & Meia · ola@voltaemeia.pt
 * · Rua de Cedofeita 212".
 *
 * Apanhado por um teste que corre os doze artboards do princípio ao fim e
 * procura o que ficou do desenho. A lista é fechada e explícita de propósito:
 * uma substituição por adivinhação apagava texto que é para ficar.
 */

export interface DadosDoComerciante {
  nome: string;
  morada: string | null;
  telefone: string | null;
  email: string | null;
  horario: string | null;
}

/** Como o HTML escreve um `&`. O nome da loja aparece nas duas formas. */
function paraHtml(v: string): string {
  return v.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/**
 * As trocas, por ordem: as mais compridas primeiro.
 *
 * "912 345 678" é parte de "+351912345678" escrito de outra forma, e o nome da
 * loja aparece dentro do email. Trocar pelo fim para o princípio deixava
 * pedaços do exemplo pelo meio.
 */
export function substituirDemo(html: string, d: DadosDoComerciante): string {
  const nome = paraHtml(d.nome);
  let saida = html;

  const trocas: Array<[string, string | null]> = [
    // O email primeiro: contém "voltaemeia", que também está no endereço do
    // site e no nome.
    ['ola@voltaemeia.pt', d.email],
    ['https://voltaemeia.pt', null],
    ['voltaemeia.pt', null],

    ['Rua de Cedofeita 212, 4050-174 Porto', d.morada],
    ['Rua de Cedofeita 212', d.morada],
    // A rua aparece também DENTRO das frases da página de contacto — "Rua de
    // Cedofeita abaixo. Trindade, 9 minutos." Trocada na mesma: a frase fica
    // um pouco estranha até alguém a reescrever, mas a morada de outra loja na
    // página desta é pior. É texto para editar, e é para isso que serve o
    // editor.
    ['Rua de Cedofeita', d.morada],
    // Sozinha, sem "Rua de": "Recolha na loja, Cedofeita" e "envie-a para
    // Cedofeita 212". Fica por último para não comer as formas compridas.
    ['Cedofeita 212', d.morada],
    ['Cedofeita', d.morada],
    ['4050-174 Porto', null],

    ['Seg a Sáb 10h–19h30 · Domingo fechado', d.horario],
    ['Seg a Sáb 10h–19h30', d.horario],

    ['+351 912 345 678', d.telefone],
    ['+351912345678', d.telefone],
    ['912 345 678', d.telefone],

    ['NIF 500 000 000 · LIVRO DE RECLAMAÇÕES · PRIVACIDADE', nome],

    ['Volta &amp; Meia', nome],
    ['Volta & Meia', nome],
  ];

  for (const [exemplo, real] of trocas) {
    // Sem dado do comerciante, o exemplo SAI na mesma: melhor um vazio do que
    // a morada de outra loja na página desta.
    saida = saida.split(exemplo).join(real ? paraHtml(real) : '');
  }

  return saida;
}
