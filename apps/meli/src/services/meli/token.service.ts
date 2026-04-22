import { createClient } from '@supabase/supabase-js';
import { MELI_API_BASE, MELI_LIMITS, MELI_ERROR_CODES } from '@/lib/meli/constants';
import type { MeliTokenData, MeliAccount, MeliApiError } from '@/types/meli';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Servicio de manejo de tokens OAuth 2.0 de Mercado Libre
 * Implementa auto-refresh de tokens antes de expirar
 */
export class TokenService {
  private static instance: TokenService;
  private refreshPromises: Map<string, Promise<MeliTokenData>> = new Map();

  static getInstance(): TokenService {
    if (!TokenService.instance) {
      TokenService.instance = new TokenService();
    }
    return TokenService.instance;
  }

  /**
   * Obtiene un token válido para una cuenta
   * Si el token está por expirar, lo refresca automáticamente
   */
  async getValidToken(accountId: string): Promise<string> {
    const { data: account, error } = await supabase
      .from('linked_meli_accounts')
      .select('*')
      .eq('id', accountId)
      .single();

    if (error || !account) {
      throw new Error(`Cuenta no encontrada: ${accountId}`);
    }

    // Verificar si el token está por expirar (con 5 minutos de margen)
    const expiresAt = new Date(account.token_expires_at);
    const now = new Date();
    const fiveMinutes = 5 * 60 * 1000;

    if (expiresAt.getTime() - now.getTime() < fiveMinutes) {
      // Token por expirar, refrescar
      const tokenData = await this.refreshToken(accountId);
      return tokenData.access_token;
    }

    return account.access_token;
  }

  /**
   * Refresca el token de una cuenta usando el refresh_token
   * Implementa deduplicación para evitar múltiples refreshes simultáneos
   */
  async refreshToken(accountId: string): Promise<MeliTokenData> {
    // Si ya hay un refresh en progreso, reutilizar la promesa
    if (this.refreshPromises.has(accountId)) {
      return this.refreshPromises.get(accountId)!;
    }

    const refreshPromise = this.performRefresh(accountId);
    this.refreshPromises.set(accountId, refreshPromise);

    try {
      const result = await refreshPromise;
      return result;
    } finally {
      this.refreshPromises.delete(accountId);
    }
  }

  private async performRefresh(accountId: string): Promise<MeliTokenData> {
    // Obtener datos de la cuenta
    const { data: account, error } = await supabase
      .from('linked_meli_accounts')
      .select('*')
      .eq('id', accountId)
      .single();

    if (error || !account) {
      throw new Error(`Cuenta no encontrada: ${accountId}`);
    }

    if (!account.refresh_token) {
      throw new Error(`No hay refresh_token para la cuenta: ${accountId}`);
    }

    // Llamar a la API de MeLi para refrescar el token
    const response = await fetch(`${MELI_API_BASE}/oauth/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json',
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        client_id: process.env.MELI_CLIENT_ID || '',
        client_secret: process.env.MELI_CLIENT_SECRET || '',
        refresh_token: account.refresh_token,
      }),
    });

    if (!response.ok) {
      const errorData: MeliApiError = await response.json();
      
      // Manejar errores específicos
      if (errorData.error === MELI_ERROR_CODES.INVALID_GRANT) {
        // Token revocado o expirado, marcar cuenta como desconectada
        await this.markAccountAsDisconnected(accountId);
        throw new Error(`Token inválido para cuenta ${accountId}. Se requiere reconexión.`);
      }
      
      throw new Error(`Error refrescando token: ${errorData.message}`);
    }

    const tokenData: MeliTokenData = await response.json();

    // Calcular fecha de expiración
    const expiresAt = new Date();
    expiresAt.setSeconds(expiresAt.getSeconds() + tokenData.expires_in);

    // Guardar nuevos tokens en la base de datos
    const { error: updateError } = await supabase
      .from('linked_meli_accounts')
      .update({
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
        token_expires_at: expiresAt.toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', accountId);

    if (updateError) {
      throw new Error(`Error guardando tokens: ${updateError.message}`);
    }

    console.log(`[TokenService] Token refrescado para cuenta ${accountId}`);
    return tokenData;
  }

  /**
   * Guarda los tokens de una cuenta recién conectada
   */
  async saveTokens(
    accountId: string, 
    tokenData: MeliTokenData
  ): Promise<void> {
    const expiresAt = new Date();
    expiresAt.setSeconds(expiresAt.getSeconds() + tokenData.expires_in);

    const { error } = await supabase
      .from('linked_meli_accounts')
      .update({
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
        token_expires_at: expiresAt.toISOString(),
        meli_user_id: tokenData.user_id.toString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', accountId);

    if (error) {
      throw new Error(`Error guardando tokens: ${error.message}`);
    }
  }

  /**
   * Marca una cuenta como desconectada (tokens inválidos)
   */
  private async markAccountAsDisconnected(accountId: string): Promise<void> {
    await supabase
      .from('linked_meli_accounts')
      .update({
        is_active: false,
        access_token: null,
        refresh_token: null,
        token_expires_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', accountId);

    console.warn(`[TokenService] Cuenta ${accountId} marcada como desconectada`);
  }

  /**
   * Verifica el estado de los tokens de todas las cuentas activas
   * Útil para ejecutar en un cron job
   */
  async checkAllTokens(): Promise<{
    refreshed: string[];
    failed: string[];
  }> {
    const { data: accounts, error } = await supabase
      .from('linked_meli_accounts')
      .select('id, token_expires_at')
      .eq('is_active', true);

    if (error || !accounts) {
      throw new Error(`Error obteniendo cuentas: ${error?.message}`);
    }

    const refreshed: string[] = [];
    const failed: string[] = [];

    for (const account of accounts) {
      try {
        await this.getValidToken(account.id);
        refreshed.push(account.id);
      } catch (err) {
        failed.push(account.id);
        console.error(`[TokenService] Error verificando cuenta ${account.id}:`, err);
      }
    }

    return { refreshed, failed };
  }

  /**
   * Obtiene el tiempo restante de validez de un token
   */
  async getTokenTimeRemaining(accountId: string): Promise<number> {
    const { data: account, error } = await supabase
      .from('linked_meli_accounts')
      .select('token_expires_at')
      .eq('id', accountId)
      .single();

    if (error || !account?.token_expires_at) {
      return 0;
    }

    const expiresAt = new Date(account.token_expires_at);
    const now = new Date();
    return Math.max(0, expiresAt.getTime() - now.getTime());
  }
}

// Exportar singleton
export const tokenService = TokenService.getInstance();
