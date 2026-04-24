import { redirect } from "next/navigation";

// Esta página fue unificada en /preguntas (sin duplicados)
export default function MensajesPage() {
  redirect("/preguntas");
}
