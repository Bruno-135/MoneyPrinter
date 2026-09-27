import { EMAIL_DA_AGENCIA, INSTAGRAM_DA_AGENCIA, PORTA_DO_WHATSAPP } from '@/lib/vaidesign/agencia';

/**
 * A marca da agência dentro do painel.
 *
 * O logótipo é o mesmo do site e é feito de letra e de um ponto, como lá: o
 * «vaı» com o «i» sem pinto, e o pinto promovido a ponto cor de laranja. Não
 * é uma imagem, e é melhor assim — acompanha o tamanho da letra, não fica
 * desfocado num ecrã Retina e não espera por download nenhum.
 *
 * Aqui não salta. No site o ponto atravessa a palavra aos pulos quando a
 * página abre, e isso está certo numa montra que se vê uma vez. Num painel de
 * trabalho, que se abre vinte vezes por dia, um logótipo que salta de cada vez
 * deixa de ser uma assinatura e passa a ser um tique.
 */
export function LogotipoDoPainel() {
  return (
    <span aria-label="VaiDesign" className="flex items-baseline text-[26px] leading-none">
      <span
        className="relative block"
        style={{
          font: "800 1em/.78 'Barlow Condensed', 'Arial Narrow', sans-serif",
          letterSpacing: '-.02em',
        }}
      >
        vaı
        <span
          aria-hidden
          className="bg-marca absolute rounded-full"
          style={{ right: '-.3em', top: '-.02em', width: '.19em', height: '.19em' }}
        />
      </span>
      <span
        className="ml-[.34em] font-mono uppercase"
        style={{ fontSize: '.3em', letterSpacing: '.3em' }}
      >
        design
      </span>
    </span>
  );
}

/**
 * O suporte, no fundo da barra lateral.
 *
 * São os contactos do Bruno. Hoje o painel tem um utilizador só e isto parece
 * dar-lhe o seu próprio número — mas o painel é para ter mais gente, e quando
 * tiver, quem entrar precisa de saber a quem perguntar sem ir procurar fora.
 *
 * O WhatsApp vai por `/wa`, a mesma porta do site: o número não anda escrito
 * em página nenhuma, nem nesta.
 */
export function SuporteDoPainel() {
  return (
    <div className="border-line mt-auto border-t px-4 pt-3 pb-4">
      <div className="text-ink3 pb-1.5 font-mono text-[10px] tracking-[0.14em] uppercase">
        suporte
      </div>
      <div className="flex flex-col gap-1 text-[12px]">
        <a
          href={PORTA_DO_WHATSAPP}
          target="_blank"
          rel="noreferrer"
          className="text-ink2 hover:text-marca"
        >
          WhatsApp
        </a>
        <a href={`mailto:${EMAIL_DA_AGENCIA}`} className="text-ink2 hover:text-marca break-all">
          {EMAIL_DA_AGENCIA}
        </a>
        <a
          href={`https://instagram.com/${INSTAGRAM_DA_AGENCIA}`}
          target="_blank"
          rel="noreferrer"
          className="text-ink3 hover:text-marca"
        >
          @{INSTAGRAM_DA_AGENCIA}
        </a>
      </div>
    </div>
  );
}
