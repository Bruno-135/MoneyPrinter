/**
 * Há quanto tempo, dito como se diz.
 *
 * "há 2 horas" vale mais do que "14/09/2026 09:12" quando o que interessa é
 * decidir se ainda vale a pena ligar hoje. A data exata só ganha depois de uns
 * dias, quando o "há quanto tempo" deixa de dizer nada.
 */
export function haQuantoTempo(iso: string, agora: Date = new Date()): string {
  const minutos = Math.floor((agora.getTime() - new Date(iso).getTime()) / 60_000);

  if (minutos < 1) return 'agora mesmo';
  if (minutos < 60) return `há ${minutos} min`;

  const horas = Math.floor(minutos / 60);
  if (horas < 24) return `há ${horas} ${horas === 1 ? 'hora' : 'horas'}`;

  const dias = Math.floor(horas / 24);
  if (dias === 1) return 'ontem';
  if (dias < 30) return `há ${dias} dias`;

  return new Date(iso).toLocaleDateString('pt-PT');
}
