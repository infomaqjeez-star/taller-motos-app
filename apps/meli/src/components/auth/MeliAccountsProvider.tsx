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
  const [accounts, setAccounts] = useState<LinkedMeliAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  // Función para cargar cuentas
  const refreshAccounts = useCallback(async () => {
    if (!user) {
      setAccounts([]);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("linked_meli_accounts")
        .select("id, user_id, meli_user_id, meli_nickname, is_active, created_at, updated_at")
        .eq("user_id", user.id)
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Sin dependencias - usa user desde closure

  // Cargar cuentas inicialmente
  useEffect(() => {
    refreshAccounts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]); // Solo cuando cambia user, no cuando cambia refreshAccounts

  // Escuchar cambios en tiempo real
  useEffect(() => {
    if (!user) return;

    console.log("[MeliAccounts] Iniciando suscripción realtime...");

    const subscription = supabase
      .channel("linked_meli_accounts_changes")
      .on(
        "postgres_changes",
        {
          event: "*", // INSERT, UPDATE, DELETE
          schema: "public",
          table: "linked_meli_accounts",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          console.log("[MeliAccounts] Cambio detectado:", payload.eventType, payload);
          
          // Recargar cuentas cuando hay cambios
          refreshAccounts();

          // Si es una nueva cuenta, mostrar notificación
          if (payload.eventType === "INSERT") {
            const newAccount = payload.new as LinkedMeliAccount;
            console.log("[MeliAccounts] Nueva cuenta conectada:", newAccount.meli_nickname);
            
            // Disparar evento personalizado para que otros componentes se enteren
            window.dispatchEvent(new CustomEvent("meli:account-connected", {
              detail: { account: newAccount }
            }));
          }
        }
      )
      .subscribe();

    return () => {
      console.log("[MeliAccounts] Cancelando suscripción realtime...");
      subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]); // Solo cuando cambia user, no cuando cambia refreshAccounts

  return (
    <MeliAccountsContext.Provider
      value={{
        accounts,
        loading,
        refreshAccounts,
        lastUpdate,
      }}
    >
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
