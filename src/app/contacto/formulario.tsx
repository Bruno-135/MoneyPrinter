'use client';

import { useActionState, useEffect, useRef } from 'react';
import { CAMPO_ISCO } from '@/lib/vaidesign/pedidos/campos';
import { MENSAGEM_DE_EXEMPLO } from '@/lib/vaidesign/desenho/dados';
import { enviarPedido } from './actions';
import { ENVIO_PARADO, type EstadoDoEnvio } from './estado';

/**
 * A página de contacto, viva.
 *
 * O HTML é o do desenho e vem inteiro, com as quatro partes do formulário lá
 * todas — o formulário, o campo de contacto certo, o campo de contacto com
 * erro e o painel do «recebido». Quem escolhe o que se vê é a classe do
 * envelope, e não uma troca de HTML: trocar o HTML dava nós novos no DOM e
 * apagava o que a pessoa tinha escrito.
 *
 * UM FORMULÁRIO POR LARGURA, e isto foi um erro apanhado no browser e não nos
 * testes. O desenho vem em 390 e em 1440, e as duas versões estão as duas na
 * página — uma escondida por CSS. Com um `<form>` só à volta das duas, o
 * browser enviava os campos das DUAS, e os da escondida iam vazios. Como o
 * servidor lê o primeiro de cada nome, o formulário falhava sempre a
 * validação, tivesse a pessoa escrito o que tivesse. Com um formulário por
 * largura, só vai o que está à vista.
 *
 * Funciona sem JavaScript: a ação é do servidor, os formulários são `<form>` a
 * sério, e a classe do estado é calculada no render — que também corre no
 * servidor quando o browser faz o pedido à moda antiga.
 */

interface Props {
  /** O artboard de telemóvel, já cheio. */
  telemovel: string;
  /** O artboard de computador, já cheio. */
  computador: string;
}

function classeDoEstado(estado: EstadoDoEnvio): string {
  if (estado.fase === 'enviado') return 'vd-mostra-enviado';
  if (estado.fase === 'erro' && estado.falta === 'contacto') return 'vd-mostra-erro';
  return '';
}

/**
 * O campo que ninguém vê.
 *
 * Um robô a preencher tudo o que encontra preenche-o também, e é assim que se
 * apanha. Fora do ecrã em vez de `display:none`, que é o primeiro sítio onde
 * um robô com jeito vai ver.
 */
function Isco() {
  return (
    <input
      type="text"
      name={CAMPO_ISCO}
      tabIndex={-1}
      autoComplete="off"
      aria-hidden="true"
      style={{ position: 'absolute', left: '-9999px', width: 1, height: 1, opacity: 0 }}
    />
  );
}

export function ContactoVivo({ telemovel, computador }: Props) {
  const [estado, acao] = useActionState(enviarPedido, ENVIO_PARADO);
  const envelope = useRef<HTMLDivElement>(null);

  // Repõe o que a pessoa escreveu quando o servidor devolve um erro. Os campos
  // são nós do DOM dentro do HTML do desenho, não campos controlados pelo
  // React — por isso escreve-se neles directamente. Sem JavaScript isto não
  // corre, mas aí o browser também não chegou a apagar nada.
  useEffect(() => {
    if (estado.fase !== 'erro') return;
    const raiz = envelope.current;
    if (!raiz) return;

    const repor = (nome: string, valor: string) => {
      if (!valor) return;
      for (const campo of raiz.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>(
        `[name="${nome}"]`,
      )) {
        if (!campo.value) campo.value = valor;
      }
    };
    repor('negocio', estado.valores.negocio);
    repor('pedido', estado.valores.pedido);
    repor('prazo', estado.valores.prazo);
  }, [estado]);

  // O «Copiar exemplo» do desenho. Copia para a área de transferência e, se a
  // caixa ainda estiver vazia, escreve lá o exemplo — que é o que a pessoa
  // queria fazer a seguir de qualquer maneira.
  useEffect(() => {
    const raiz = envelope.current;
    if (!raiz) return;

    const usarExemplo = (evento: Event) => {
      const alvo = (evento.target as HTMLElement | null)?.closest('[data-copiar-exemplo]');
      if (!alvo) return;
      evento.preventDefault();

      void navigator.clipboard?.writeText(MENSAGEM_DE_EXEMPLO).catch(() => {});

      const caixa = alvo
        .closest('form')
        ?.querySelector<HTMLTextAreaElement>('textarea[name="pedido"]');
      if (caixa && !caixa.value.trim()) {
        caixa.value = MENSAGEM_DE_EXEMPLO;
        caixa.focus();
      }
    };

    raiz.addEventListener('click', usarExemplo);
    return () => raiz.removeEventListener('click', usarExemplo);
  }, []);

  const classe = `vd-contacto ${classeDoEstado(estado)}`;

  return (
    <div ref={envelope}>
      {estado.mensagem && (
        <p
          role="alert"
          style={{
            margin: '0 auto',
            maxWidth: 640,
            padding: '16px 20px',
            background: '#FFFBF5',
            border: '1.5px solid #BA4100',
            borderRadius: 8,
            color: '#BA4100',
            font: "500 16px/1.5 'Hanken Grotesk', system-ui, sans-serif",
          }}
        >
          {estado.mensagem}
        </p>
      )}

      <form action={acao} className={`${classe} vd-tela vd-390`}>
        <Isco />
        <div dangerouslySetInnerHTML={{ __html: telemovel }} />
      </form>

      <form action={acao} className={`${classe} vd-tela vd-1440`}>
        <Isco />
        <div dangerouslySetInnerHTML={{ __html: computador }} />
      </form>
    </div>
  );
}
