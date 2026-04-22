import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

const fetchQuestionsUnified = async () => {
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session?.access_token) {
    throw new Error("No hay sesión activa");
  }

  const response = await fetch(`/api/meli-questions-unified?_t=${Date.now()}`, {
    headers: {
      Authorization: `Bearer ${session.access_token}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Error ${response.status}`);
  }

  return response.json();
};

const answerQuestion = async ({ 
  questionId, 
  accountId, 
  text 
}: { 
  questionId: number; 
  accountId: string; 
  text: string;
}) => {
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session?.access_token) {
    throw new Error("No hay sesión activa");
  }

  const response = await fetch("/api/meli-answer", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({
      question_id: questionId,
      account_id: accountId,
      text,
    }),
  });

  if (!response.ok) {
    throw new Error("Error al enviar respuesta");
  }

  return response.json();
};

export function useQuestionsUnified() {
  return useQuery({
    queryKey: ["questions", "unified"],
    queryFn: fetchQuestionsUnified,
    refetchInterval: 30000, // Refetch cada 30 segundos
    staleTime: 1000 * 60, // 1 minuto
  });
}

export function useAnswerQuestion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: answerQuestion,
    onSuccess: () => {
      toast.success("Respuesta enviada correctamente");
      // Invalidar cache para refrescar preguntas
      queryClient.invalidateQueries({ queryKey: ["questions", "unified"] });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Error al enviar respuesta");
    },
  });
}
