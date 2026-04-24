"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "./AuthProvider";

interface LinkedMeliAccount {
  id: string;
  user_id: string;
  meli_user_id: string;
  meli_nickname: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface MeliAccountsContextType {
  accounts: LinkedMeliAccount[];
  loading: boolean;
  refreshAccounts: () => Promise<void>;
  lastUpdate: Date | null;
}

const MeliAccountsContext = createContext<MeliAccountsContextType | undefined>(undefined);

export function MeliAccountsProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();

  // ── CLAVE: usar el ID (primitivo string) como dependencia, NO el objeto user completo.
  // El objeto user se recrea en cada TOKEN_REFRESHED (cada ~55min), lo que causaba
  // que refreshAccounts y la suscripción realtime se reiniciaran en loop constante.
  const userId = user?.id ?? null;

  const [accounts, setAccounts] = useState<LinkedMeliAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const refreshAccounts = useCallback(async () => {
    if (!userId) {
      setAccounts([]);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("linked_meli_accounts")
        .select("id, user_id, meli_user_id, meli_nickname, is_active, created_at, updated_at")
        .eq("user_id", userId)
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("[MeliAccounts] Error cargando cuentas:", error);
        return;
      }

      setAccounts(data || []);
      setLastUpdate(new Date());
      console.log("[MeliAccounts] Cuentas actualizadas:", data?.length || 0);
    } catch (err) {
      console.error("[MeliAccounts] Error inesperado:", err);
    } finally {
      setLoading(false);
    }
  }, [userId]); // Solo depende del ID (string estable), no del objeto user

  // Carga inicial
  useEffect(() => {
    refreshAccounts();
  }, [refreshAccounts]);

  // Suscripción realtime — solo se reinicia cuando cambia el userId (login/logout),
  // NO cuando el token se renueva (era la causa del loop de suscripción).
  useEffect(() => {
    if (!userId) return;

    console.log("[MeliAccounts] Iniciando suscripción realtime...");

    const subscription = supabase
      .channel(`linked_meli_accounts_${userId}`) // canal único por usuario
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "linked_meli_accounts",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          console.log("[MeliAccounts] Cambio detectado:", payload.eventType);
          refreshAccounts();

          if (payload.eventType === "INSERT") {
            const newAccount = payload.new as LinkedMeliAccount;
            window.dispatchEvent(new CustomEvent("meli:account-connected", {
              detail: { account: newAccount },
            }));
          }
        }
      )
      .subscribe();

    return () => {
      console.log("[MeliAccounts] Cancelando suscripción realtime...");
      subscription.unsubscribe();
    };
  }, [userId]); // SOLO userId — sin refreshAccounts que era la fuente del loop

  return (
    <MeliAccountsContext.Provider value={{ accounts, loading, refreshAccounts, lastUpdate }}>
      {children}
    </MeliAccountsContext.Provider>
  );
}

export function useMeliAccounts() {
  const context = useContext(MeliAccountsContext);
  if (context === undefined) {
    throw new Error("useMeliAccounts must be used within a MeliAccountsProvider");
  }
  return context;
}
