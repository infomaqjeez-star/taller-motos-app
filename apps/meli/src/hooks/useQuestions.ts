import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

async function getSessionToken() {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.access_token) {
    throw new Error("No hay sesión activa");
  }

  return session.access_token;
}

const fetchQuestionsUnified = async () => {
  const token = await getSessionToken();

  const response = await fetch(`/api/meli-questions-unified?_t=${Date.now()}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const data = await response.json().catch(() => null);

  if (!response.ok || data?.error) {
    throw new Error(data?.error || `Error ${response.status}`);
  }

  return data;
};

const answerQuestion = async ({
  questionId,
  accountId,
  text,
}: {
  questionId: number;
  accountId: string;
  text: string;
}) => {
  const token = await getSessionToken();

  const response = await fetch("/api/meli-answer", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      question_id: questionId,
      answer_text: text,
      accountId,
    }),
  });

  const data = await response.json().catch(() => null);

  if (!response.ok || data?.status === "error") {
    throw new Error(data?.error || "Error al enviar respuesta");
  }

  return data;
};

export function useQuestionsUnified() {
  return useQuery({
    queryKey: ["questions", "unified"],
    queryFn: fetchQuestionsUnified,
    refetchInterval: 30000,
    staleTime: 1000 * 60,
  });
}

export function useAnswerQuestion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: answerQuestion,
    onSuccess: () => {
      toast.success("Respuesta enviada correctamente");
      queryClient.invalidateQueries({ queryKey: ["questions", "unified"] });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Error al enviar respuesta");
    },
  });
}