/**
 * O campo «Telemóvel ou email», que eram dois e passam a ser um.
 *
 * ISTO ERA O BOTÃO «ENVIAR PEDIDO» A NÃO FAZER NADA. Vale a pena contar, porque
 * não se vê no HTML nem nos testes e levou o site inteiro a estar no ar durante
 * dias sem nunca ter recebido um pedido.
 *
 * O desenho traz o campo do contacto duas vezes: uma no estado normal e outra
 * no estado de erro, com a moldura vermelha e o aviso por baixo. Os dois têm
 * `required`, porque no desenho nunca estão os dois ao mesmo tempo. Aqui estão:
 * as quatro partes do formulário ficam todas na página e é o CSS que escolhe o
 * que se vê (ver `partes.ts`), e isso é preciso para não se apagar o que a
 * pessoa escreveu.
 *
 * Só que um campo `required` escondido com `display:none` continua a contar
 * para a validação do browser. Ao carregar em «Enviar pedido», o browser
 * encontrava o campo de erro vazio, recusava-se a enviar, tentava pôr o cursor
 * lá para mostrar o balão — e não conseguia, porque está escondido. Então não
 * fazia nada. Nada mesmo: sem balão, sem mensagem, sem pedido. Só uma linha na
 * consola que ninguém lê:
 *
 *     An invalid form control with name='contacto' is not focusable.
 *
 * A saída é não haver dois campos. Fica o do estado normal, e do de erro fica
 * só o aviso, mudado para dentro da mesma etiqueta — é onde o desenho o tinha.
 * A moldura vermelha passa a ser CSS sobre o mesmo campo.
 *
 * Ganha-se mais do que o envio: sendo o mesmo nó do DOM, o que a pessoa
 * escreveu continua lá quando o erro aparece. Antes trocava-se um campo cheio
 * por um campo vazio e ela tinha de escrever o contacto outra vez — logo a
 * seguir a lhe dizermos que o contacto estava mal.
 */

/** O fecho que corresponde a uma abertura, contando as que abrem lá dentro. */
function fecho(html: string, aberturaEm: number, marca: string): number {
  const abre = `<${marca}`;
  const fecha = `</${marca}>`;
  let i = aberturaEm + abre.length;
  let profundidade = 1;

  while (i < html.length) {
    const proximoAbre = html.indexOf(abre, i);
    const proximoFecha = html.indexOf(fecha, i);
    if (proximoFecha === -1) throw new Error(`<${marca}> sem fecho`);

    if (proximoAbre !== -1 && proximoAbre < proximoFecha) {
      profundidade += 1;
      i = proximoAbre + abre.length;
      continue;
    }

    profundidade -= 1;
    if (profundidade === 0) return proximoFecha;
    i = proximoFecha + fecha.length;
  }

  throw new Error(`<${marca}> sem fecho`);
}

const OK2 = '<div class="vd-parte vd-parte-ok2">';
const ERRO = '<div class="vd-parte vd-parte-erro">';
const AVISO = '<span id="erro-contacto"';

/**
 * Funde as duas versões do campo de contacto numa só.
 *
 * Corre depois de `abrirAsPartes` e antes do motor: aqui as partes já são
 * divisões com classe e o desenho ainda está por encher.
 *
 * O aviso leva um `id` diferente em cada largura porque as duas larguras estão
 * as duas na página, e dois elementos com o mesmo `id` mandam o
 * `aria-describedby` de uma para o aviso da outra.
 */
export function fundirOCampoDeContacto(html: string, largura: 390 | 1440): string {
  const inicioDoErro = html.indexOf(ERRO);
  const inicioDoOk2 = html.indexOf(OK2);
  if (inicioDoErro === -1 || inicioDoOk2 === -1) {
    throw new Error('o desenho do contacto já não tem as duas versões do campo — ver `contacto.ts`');
  }

  const fimDoErro = fecho(html, inicioDoErro, 'div');
  const dentroDoErro = html.slice(inicioDoErro + ERRO.length, fimDoErro);
  if (!dentroDoErro.includes('name="contacto"')) {
    throw new Error('a parte de erro do contacto já não tem o campo — ver `contacto.ts`');
  }

  // O aviso: «Falta o telemóvel ou o email. É por aí que lhe respondo.»
  const inicioDoAviso = dentroDoErro.indexOf(AVISO);
  if (inicioDoAviso === -1) {
    throw new Error('a parte de erro do contacto já não tem o aviso — ver `contacto.ts`');
  }
  const fimDoAviso = fecho(dentroDoErro, inicioDoAviso, 'span');
  const id = `erro-contacto-${largura}`;
  const aviso = dentroDoErro
    .slice(inicioDoAviso, fimDoAviso + '</span>'.length)
    .replace(AVISO, `<span id="${id}" data-erro-do-contacto`);

  // Fora a versão de erro inteira. É ela que estava a travar o envio.
  const semErro = html.slice(0, inicioDoErro) + html.slice(fimDoErro + '</div>'.length);

  const inicio = semErro.indexOf(OK2);
  const fim = fecho(semErro, inicio, 'div');
  const dentro = semErro.slice(inicio + OK2.length, fim);

  const fimDaEtiqueta = dentro.lastIndexOf('</label>');
  if (fimDaEtiqueta === -1) throw new Error('o campo de contacto já não está numa etiqueta');

  const comAviso =
    dentro.slice(0, fimDaEtiqueta) + aviso + dentro.slice(fimDaEtiqueta);

  // O campo deixa de ser uma das partes que se trocam: é o único que há.
  const novo = `<div class="vd-parte vd-parte-contacto">${comAviso.replace(
    '<input name="contacto"',
    `<input name="contacto" aria-describedby="${id}"`,
  )}</div>`;

  return semErro.slice(0, inicio) + novo + semErro.slice(fim + '</div>'.length);
}
