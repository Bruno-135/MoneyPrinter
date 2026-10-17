import { redirect } from "next/navigation";

/** Antigo placeholder "Enviar música": agora é a aba Arquivo de /musica. */
export default function UploadPage() {
  redirect("/musica?modo=arquivo");
}
