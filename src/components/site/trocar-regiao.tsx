"use client";

import { usePathname } from "next/navigation";
import { useState, useSyncExternalStore } from "react";
import {
  mesmaPaginaNoutraRegiao,
  NOME_DA_REGIAO,
  type Regiao,
} from "@/lib/vaidesign/regiao";

/**
 * A barra que sugere a outra versão do site, e o botão que a troca.
 *
 * SUGERE, não manda. A tentação é mandar o visitante brasileiro para `/br`
 * assim que ele chega, e isso está errado por duas razões: um português de
 * férias no Brasil fica preso numa versão que não pediu, e o Google penaliza
 * quem lhe muda a página debaixo dos pés. Quem escolhe é quem lê.
 *
 * A barra aparece uma vez. Se a pessoa a fechar, não volta — a escolha fica
 * guardada no browser dela. Uma sugestão que reaparece a cada página deixa de
 * ser sugestão e passa a ser insistência.
 *
 * O botão leva à MESMA página na outra versão. Quem está a ler os serviços e
 * carrega em «Brasil» continua nos serviços; mandá-lo para a entrada do site
 * era fazê-lo perder o que estava a ler.
 */

const GUARDADO = "vd-regiao-escolhida";

interface Props {
  regiao: Regiao;
  /** O país de quem está a ver, como o servidor o viu. Vazio se não souber. */
  pais?: string;
}

/**
 * O que a pessoa já escolheu, lido do browser.
 *
 * Lê-se com `useSyncExternalStore` e não num efeito: no servidor devolve
 * sempre `null` — que é o que o servidor sabe — e no browser devolve o valor
 * guardado, sem uma segunda passagem de desenho a mudar a página debaixo dos
 * olhos de quem está a ler.
 */
function useEscolhaGuardada(): string | null {
  return useSyncExternalStore(
    () => () => {},
    () => {
      try {
        return localStorage.getItem(GUARDADO);
      } catch {
        // Sem armazenamento — a sugestão aparece na mesma. Mais vale uma
        // sugestão repetida do que nenhuma.
        return null;
      }
    },
    () => null,
  );
}

/**
 * A barra de sugestão. Vai no topo, porque é onde se vê antes de se começar a
 * ler — e porque só aparece a quem está no país da outra versão.
 */
export function SugerirRegiao({ regiao, pais }: Props) {
  const caminho = usePathname();
  const [fechou, setFechou] = useState(false);
  const jaEscolheu = useEscolhaGuardada();

  const outra: Regiao = regiao === "pt" ? "br" : "pt";
  const paraOutra = mesmaPaginaNoutraRegiao(caminho, outra);

  // Só se sugere a versão do Brasil a quem está no Brasil e está a ver a de
  // Portugal. O contrário não: quem está em Portugal e abriu `/br` fê-lo de
  // propósito.
  const sugerir = regiao === "pt" && pais === "BR" && !jaEscolheu && !fechou;

  const naoMostrarMais = () => {
    try {
      localStorage.setItem(GUARDADO, "pt");
    } catch {
      // Não faz mal: a barra volta a aparecer da próxima e mais nada.
    }
    setFechou(true);
  };

  return (
    <>
      {sugerir && (
        <div
          role="region"
          aria-label="Escolher a versão do site"
          style={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            justifyContent: "center",
            gap: 12,
            padding: "10px 16px",
            background: "#141210",
            color: "#F6EFE4",
            font: "400 14px/1.4 'Hanken Grotesk', system-ui, sans-serif",
          }}
        >
          <span>Está no Brasil?</span>
          <a
            data-trocar-regiao
            href={paraOutra}
            onClick={naoMostrarMais}
            style={{
              padding: "6px 14px",
              background: "#EC5B13",
              color: "#141210",
              borderRadius: 999,
              font: "600 13px/1 'Hanken Grotesk', system-ui, sans-serif",
              textDecoration: "none",
            }}
          >
            Ver em português do Brasil
          </a>
          <button
            type="button"
            onClick={naoMostrarMais}
            style={{
              background: "transparent",
              border: 0,
              color: "#BDB3A6",
              font: "400 13px/1 'Hanken Grotesk', system-ui, sans-serif",
              textDecoration: "underline",
              cursor: "pointer",
            }}
          >
            Não, obrigado
          </button>
        </div>
      )}
    </>
  );
}

/**
 * O botão que troca de versão, sempre disponível.
 *
 * Vai no FIM da página, ao pé do resto da informação da agência, e não no
 * topo: quem o procura sabe onde o encontrar, e quem não o procura não
 * tropeça nele antes de ler o que veio ler.
 */
export function EscolherRegiao({ regiao }: { regiao: Regiao }) {
  const caminho = usePathname();
  const outra: Regiao = regiao === "pt" ? "br" : "pt";
  const paraOutra = mesmaPaginaNoutraRegiao(caminho, outra);

  return (
    <div
      style={{
        padding: "18px 16px 28px",
        textAlign: "center",
        background: "#141210",
        font: "400 13px/1.5 'Hanken Grotesk', system-ui, sans-serif",
        color: "#BDB3A6",
      }}
    >
      <a
        data-trocar-regiao
        href={paraOutra}
        style={{ color: "#F6EFE4", textDecoration: "none", fontWeight: 600 }}
      >
        {NOME_DA_REGIAO[outra]}
      </a>
      <span style={{ margin: "0 8px", opacity: 0.5 }}>·</span>
      <span>a ver a versão de {NOME_DA_REGIAO[regiao]}</span>
    </div>
  );
}
