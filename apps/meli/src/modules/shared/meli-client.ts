// modules/shared/meli-client.ts
// Cliente HTTP centralizado para API de MercadoLibre

import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export interface MeliAccount {
  id: string;
  meli_user_id: string;
  access_token: string;
  refresh_token: string;
  expires_at: string | null;
}

export class MeliClient {
  private account: MeliAccount;

  constructor(account: MeliAccount) {
    this.account = account;
  }

  // Obtener token válido (refrescar si es necesario)
  async getValidToken(): Promise<string> {
    // Verificar si el token está vencido
    if (this.account.expires_at && new Date(this.account.expires_at) < new Date()) {
      console.log(`[MeliClient] Token vencido para ${this.account.meli_user_id}, refrescando...`);
      await this.refreshToken();
    }
    return this.account.access_token;
  }

  // Refrescar token
  private async refreshToken(): Promise<void> {
    try {
      const response = await fetch("https://api.mercadolibre.com/oauth/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "refresh_token",
          client_id: process.env.APPJEEZ_MELI_APP_ID!,
          client_secret: process.env.APPJEEZ_MELI_SECRET_KEY!,
          refresh_token: this.account.refresh_token,
        }),
      });

      if (!response.ok) {
        throw new Error(`Error refrescando token: ${response.status}`);
      }

      const data = await response.json();
      
      // Actualizar en base de datos
      const { error } = await supabase
        .from("linked_meli_accounts")
        .update({
          access_token_enc: data.access_token,
          refresh_token_enc: data.refresh_token,
          token_expiry_date: new Date(Date.now() + data.expires_in * 1000).toISOString(),
        })
        .eq("id", this.account.id);

      if (error) throw error;

      // Actualizar en memoria
      this.account.access_token = data.access_token;
      this.account.refresh_token = data.refresh_token;
      
      console.log(`[MeliClient] Token refrescado para ${this.account.meli_user_id}`);
    } catch (error) {
      console.error(`[MeliClient] Error refrescando token:`, error);
      throw error;
    }
  }

  // Hacer petición autenticada a MeLi
  async fetch(url: string, options: RequestInit = {}): Promise<Response> {
    const token = await this.getValidToken();
    
    return fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        Authorization: `Bearer ${token}`,
      },
    });
  }

  // === MÉTODOS ESPECÍFICOS ===

  // Obtener preguntas sin responder
  async getUnansweredQuestions(): Promise<any[]> {
    const url = `https://api.mercadolibre.com/questions/search?seller_id=${this.account.meli_user_id}&status=UNANSWERED&limit=50`;
    
    const response = await this.fetch(url, {
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) {
      throw new Error(`Error obteniendo preguntas: ${response.status}`);
    }

    const data = await response.json();
    return data.questions || [];
  }

  // Obtener detalles de un item
  async getItem(itemId: string): Promise<any> {
    const response = await this.fetch(
      `https://api.mercadolibre.com/items/${itemId}`,
      { signal: AbortSignal.timeout(10000) }
    );

    if (!response.ok) {
      throw new Error(`Error obteniendo item: ${response.status}`);
    }

    return response.json();
  }

  // Responder una pregunta
  async answerQuestion(questionId: string, text: string): Promise<any> {
    const response = await this.fetch(
      `https://api.mercadolibre.com/questions/${questionId}/answers`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
        signal: AbortSignal.timeout(10000),
      }
    );

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: "Error desconocido" }));
      throw new Error(error.message || `Error respondiendo: ${response.status}`);
    }

    return response.json();
  }
}

// Factory para crear clientes
export async function createMeliClient(accountId: string): Promise<MeliClient> {
  const { data: account, error } = await supabase
    .from("linked_meli_accounts")
    .select("id, meli_user_id, access_token_enc, refresh_token_enc, token_expiry_date")
    .eq("id", accountId)
    .single();

  if (error || !account) {
    throw new Error("Cuenta no encontrada");
  }

  return new MeliClient({
    id: account.id,
    meli_user_id: account.meli_user_id,
    access_token: account.access_token_enc,
    refresh_token: account.refresh_token_enc,
    expires_at: account.token_expiry_date,
  });
}

// Obtener todas las cuentas activas de un usuario
export async function getUserAccounts(userId: string): Promise<MeliAccount[]> {
  const { data: accounts, error } = await supabase
    .from("linked_meli_accounts")
    .select("id, meli_user_id, access_token_enc, refresh_token_enc, token_expiry_date, meli_nickname")
    .eq("user_id", userId)
    .eq("is_active", true);

  if (error) {
    throw new Error(`Error obteniendo cuentas: ${error.message}`);
  }

  return (accounts || []).map(acc => ({
    id: acc.id,
    meli_user_id: acc.meli_user_id,
    access_token: acc.access_token_enc,
    refresh_token: acc.refresh_token_enc,
    expires_at: acc.token_expiry_date,
  }));
}
