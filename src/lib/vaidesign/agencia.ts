/**
 * Os dados da própria agência.
 *
 * Ficam num sítio só para não andarem espalhados pelas cinco páginas. O
 * endereço de email já vem escrito no desenho (`geral@vaidesign.net`) e é esse
 * que está a receber; o número é o do WhatsApp Business da agência (eSIM MEO),
 * o mesmo do cartão de visita e da assinatura.
 */

/**
 * O número, em formato internacional e só dígitos.
 *
 * SÓ PARA CÓDIGO DE SERVIDOR E PARA A ASSINATURA DE EMAIL. No site não anda
 * escrito em lado nenhum — nem no texto, nem dentro de um `href` — porque um
 * robô que leia a página apanha-o tão bem como uma pessoa. Quem quiser abrir
 * o WhatsApp a partir do site passa por `/wa`, que é uma porta no servidor.
 *
 * Num email é outra coisa: aí o número é para ser visto e usado por quem o
 * recebeu.
 */
export const WHATSAPP_DA_AGENCIA: string | null = '351965633614';

/** O mesmo número, escrito como se lê em voz alta. Mesma regra. */
export const TELEFONE_DA_AGENCIA = '+351 965 633 614';

/** A porta do WhatsApp no site. Não leva número nenhum. */
export const PORTA_DO_WHATSAPP = '/wa';

export const EMAIL_DA_AGENCIA = 'geral@vaidesign.net';

/** A conta do Instagram, sem o arroba. */
export const INSTAGRAM_DA_AGENCIA = 'agenciavaidesign';

/**
 * A página do Facebook.
 *
 * É o link de partilha que o Facebook dá (sem o `mibextid` de rastreio), não o
 * endereço final da página: daqui não se chega ao Facebook para o descobrir, e
 * este leva lá na mesma. Quando a página tiver nome de utilizador, troca-se
 * aqui e muda em todo o lado.
 */
export const FACEBOOK_DA_AGENCIA = 'https://www.facebook.com/share/1E5jcB5TL8/';
