"use client";

export const dynamic = "force-dynamic";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  MessageSquare,
  RefreshCw,
  Scale,
  Search,
  Send,
} from "lucide-react";
import UnifiedPostSalePanel from "@/components/UnifiedPostSalePanel";
import { useMeliAccounts } from "@/components/auth/MeliAccountsProvider";
import { supabase } from "@/lib/supabase";

interface ClaimMessage {
  id: string;
  sender_role: string;
  text: string;
  date_created: string;
}

interface Claim {
  id: string;
  claim_id: string;
  meli_account_id: string;
  meli_user_id: string;
  account_nickname: string;
  type: "claim" | "mediation";
  status: string;
  stage: string;
  reason_id: string;
  reason: string;
  resource_id: string;
  date_created: string;
  last_updated: string;
  buyer: {
    id: number;
    nickname: string;
  };
  messages: ClaimMessage[];
  resolution: unknown;
}

interface PostSaleMetric {
  meli_user_id: string;
  account_name: string;
  claims_count: number;
  mediations_count: number;
  delayed_shipments: number;
  reputation_risk: "low" | "medium" | "high" | "critical";
}

function timeAgo(date: string) {
  const diff = Date.now() - new Date(date).getTime();
  const minutes = Math.floor(diff / 60000);

  if (minutes < 1) return "ahora";
  if (minutes < 60) return `hace ${minutes}m`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `hace ${hours}h`;

  return `hace ${Math.floor(hours / 24)}d`;
}

function getRiskLevel(totalOpenItems: number): PostSaleMetric["reputation_risk"] {
  if (totalOpenItems >= 5) return "critical";
  if (totalOpenItems >= 3) return "high";
  if (totalOpenItems >= 1) return "medium";
  return "low";
}

function ClaimCard({
  claim,
  onUpdated,
}: {
  claim: Claim;
  onUpdated: () => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [runningAction, setRunningAction] = useState<"message" | "resolve" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const typeColor = claim.type === "mediation" ? "#FF5722" : "#EF4444";

  const submitAction = useCallback(
    async (action: "message" | "resolve") => {
      if (action === "message" && !replyText.trim()) {
        return;
      }

      setRunningAction(action);
      setError(null);
      setSuccess(null);

      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session?.access_token) {
          throw new Error("No hay sesión activa");
        }

        const response = await fetch("/api/meli-claims/respond", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            claim_id: claim.claim_id,
            meli_account_id: claim.meli_account_id,
            message_text: action === "message" ? replyText.trim() : undefined,
            action,
          }),
        });

        const data = await response.json().catch(() => null);

        if (!response.ok || data?.error) {
          throw new Error(data?.error || `HTTP ${response.status}`);
        }

        if (action === "message") {
          setReplyText("");
          setSuccess("Respuesta enviada");
        } else {
          setSuccess("Reclamo marcado como resuelto");
          setOpen(false);
        }

        await onUpdated();
      } catch (actionError) {
        setError(actionError instanceof Error ? actionError.message : "Error inesperado");
      } finally {
        setRunningAction(null);
      }
    },
    [claim.claim_id, claim.meli_account_id, onUpdated, replyText]
  );

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{
        background: "#1F1F1F",
        border: `1px solid ${typeColor}33`,
      }}
    >
      <button onClick={() => setOpen((value) => !value)} className="w-full text-left p-4">
        <div className="flex items-start gap-3">
          <div
            className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: `${typeColor}18` }}
          >
            {claim.type === "mediation" ? (
              <Scale className="w-5 h-5" style={{ color: typeColor }} />
            ) : (
              <AlertTriangle className="w-5 h-5" style={{ color: typeColor }} />
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span
                className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                style={{ background: `${typeColor}18`, color: typeColor }}
              >
                {claim.type === "mediation" ? "Mediación" : "Reclamo"}
              </span>
              <span
                className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                style={{ background: "#FFE60018", color: "#FFE600" }}
              >
                @{claim.account_nickname}
              </span>
              <span className="text-[10px]" style={{ color: "#6B7280" }}>
                {timeAgo(claim.date_created)}
              </span>
            </div>

            <p className="text-sm text-white font-semibold leading-snug">{claim.reason}</p>
            <p className="text-xs mt-1" style={{ color: "#9CA3AF" }}>
              Comprador: {claim.buyer.nickname || "Sin nickname"} · Estado: {claim.status}
            </p>
            <p className="text-xs mt-1" style={{ color: "#6B7280" }}>
              {claim.messages.length} mensaje{claim.messages.length === 1 ? "" : "s"} en el hilo
            </p>
          </div>
        </div>
      </button>

      {open && (
        <div className="px-4 pb-4 border-t" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
          <div className="pt-4 space-y-2">
            {claim.messages.length > 0 ? (
              claim.messages.map((message) => (
                <div key={message.id} className="rounded-xl p-3" style={{ background: "#121212" }}>
                  <p className="text-[11px] font-semibold mb-1" style={{ color: "#6B7280" }}>
                    {message.sender_role === "respondent"
                      ? "Tu respuesta"
                      : message.sender_role === "mediator"
                        ? "Mediador Mercado Libre"
                        : "Comprador"}
                    <span className="ml-2 font-normal">{timeAgo(message.date_created)}</span>
                  </p>
                  <p className="text-sm text-white whitespace-pre-wrap">{message.text || "Sin texto"}</p>
                </div>
              ))
            ) : (
              <div className="rounded-xl p-3 text-sm" style={{ background: "#121212", color: "#9CA3AF" }}>
                Todavía no hay mensajes cargados en este reclamo.
              </div>
            )}

            <textarea
              rows={3}
              value={replyText}
              onChange={(event) => setReplyText(event.target.value)}
              placeholder="Escribí la respuesta para el reclamo..."
              className="w-full px-3 py-2.5 rounded-xl text-sm text-white placeholder-gray-500 outline-none resize-none"
              style={{ background: "#121212", border: "1px solid rgba(255,255,255,0.1)" }}
            />

            {error && <p className="text-xs" style={{ color: "#EF4444" }}>Error: {error}</p>}
            {success && (
              <p className="text-xs flex items-center gap-1" style={{ color: "#39FF14" }}>
                <CheckCircle2 className="w-3.5 h-3.5" />
                {success}
              </p>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                onClick={() => void submitAction("message")}
                disabled={runningAction !== null || !replyText.trim()}
                className="flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm text-black disabled:opacity-40"
                style={{ background: "#FFE600" }}
              >
                {runningAction === "message" ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Responder
                  </>
                )}
              </button>

              <button
                onClick={() => void submitAction("resolve")}
                disabled={runningAction !== null}
                className="flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm text-white disabled:opacity-40"
                style={{ background: "#10B981" }}
              >
                {runningAction === "resolve" ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Resolviendo...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    Marcar resuelto
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function PostVentaContent() {
  const searchParams = useSearchParams();
  const selectedAccount = searchParams.get("account");
  const normalizedSelectedAccount = selectedAccount?.trim().toLowerCase() ?? "";
  const { accounts, loading: accountsLoading } = useMeliAccounts();

  const [claims, setClaims] = useState<Claim[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const loadClaims = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        throw new Error("No hay sesión activa");
      }

      const response = await fetch("/api/meli-claims", {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data: Claim[] = await response.json();
      setClaims(Array.isArray(data) ? data : []);
      setLastUpdate(new Date());
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Error cargando reclamos");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (accountsLoading) {
      return;
    }

    void loadClaims();
  }, [accountsLoading, loadClaims]);

  const accountsForPage = useMemo(() => {
    if (!normalizedSelectedAccount) {
      return accounts;
    }

    return accounts.filter((account) => account.meli_nickname.toLowerCase() === normalizedSelectedAccount);
  }, [accounts, normalizedSelectedAccount]);

  const summaryMetrics = useMemo<PostSaleMetric[]>(() => {
    return accountsForPage.map((account) => {
      const relatedClaims = claims.filter(
        (claim) =>
          claim.meli_account_id === account.id ||
          String(claim.meli_user_id) === String(account.meli_user_id) ||
          claim.account_nickname?.toLowerCase() === account.meli_nickname.toLowerCase()
      );

      const claimsCount = relatedClaims.filter((claim) => claim.type !== "mediation").length;
      const mediationsCount = relatedClaims.filter((claim) => claim.type === "mediation").length;

      return {
        meli_user_id: String(account.meli_user_id),
        account_name: account.meli_nickname,
        claims_count: claimsCount,
        mediations_count: mediationsCount,
        delayed_shipments: 0,
        reputation_risk: getRiskLevel(claimsCount + mediationsCount),
      };
    });
  }, [accountsForPage, claims]);

  const filteredClaims = useMemo(() => {
    return claims.filter((claim) => {
      if (
        normalizedSelectedAccount &&
        claim.account_nickname?.toLowerCase() !== normalizedSelectedAccount
      ) {
        return false;
      }

      if (!search.trim()) {
        return true;
      }

      const term = search.trim().toLowerCase();
      return (
        claim.reason.toLowerCase().includes(term) ||
        claim.account_nickname.toLowerCase().includes(term) ||
        claim.buyer.nickname.toLowerCase().includes(term) ||
        claim.claim_id.toLowerCase().includes(term) ||
        claim.messages.some((message) => message.text.toLowerCase().includes(term))
      );
    });
  }, [claims, normalizedSelectedAccount, search]);

  const totals = useMemo(() => {
    const claimsCount = filteredClaims.filter((claim) => claim.type !== "mediation").length;
    const mediationsCount = filteredClaims.filter((claim) => claim.type === "mediation").length;
    const messagesCount = filteredClaims.reduce((total, claim) => total + claim.messages.length, 0);

    return {
      claimsCount,
      mediationsCount,
      messagesCount,
    };
  }, [filteredClaims]);

  return (
    <main className="min-h-screen pb-24" style={{ background: "#121212" }}>
      <div
        className="sticky top-0 z-30 px-4 py-3 flex items-center justify-between border-b"
        style={{
          background: "rgba(18,18,18,0.97)",
          backdropFilter: "blur(16px)",
          borderColor: "rgba(255,255,255,0.08)",
        }}
      >
        <div className="flex items-center gap-3">
          <Link href="/" className="p-1.5 rounded-lg" style={{ background: "rgba(255,255,255,0.05)" }}>
            <ArrowLeft className="w-5 h-5 text-gray-400" />
          </Link>
          <div>
            <h1 className="font-black text-white text-base flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" style={{ color: "#EF4444" }} />
              Post-Venta {selectedAccount ? `· @${selectedAccount}` : "Unificado"}
            </h1>
            <p className="text-[10px]" style={{ color: "#6B7280" }}>
              {lastUpdate
                ? `Actualizado ${lastUpdate.toLocaleTimeString("es-AR", {
                    hour: "2-digit",
                    minute: "2-digit",
                    hour12: false,
                  })}`
                : "Cargando..."}
            </p>
          </div>
        </div>

        <button
          onClick={() => void loadClaims()}
          disabled={loading || accountsLoading}
          className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold disabled:opacity-40"
          style={{ background: "#1F1F1F", color: "#EF4444", border: "1px solid #EF444433" }}
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          {loading ? "Actualizando..." : "Actualizar"}
        </button>
      </div>

      <div className="max-w-6xl mx-auto px-4 pt-4">
        {!loading && !accountsLoading && accounts.length === 0 && (
          <div
            className="rounded-2xl p-6 mb-4 text-center"
            style={{ background: "#EF444418", border: "1px solid #EF444440" }}
          >
            <AlertTriangle className="w-10 h-10 mx-auto mb-2" style={{ color: "#EF4444" }} />
            <p className="text-white font-bold mb-1">No hay cuentas conectadas</p>
            <p className="text-sm" style={{ color: "#9CA3AF" }}>
              Conectá al menos una cuenta de Mercado Libre para ver el post-venta unificado.
            </p>
          </div>
        )}

        {!loading && !accountsLoading && accounts.length > 0 && accountsForPage.length === 0 && (
          <div
            className="rounded-2xl p-6 mb-4 text-center"
            style={{ background: "#EF444418", border: "1px solid #EF444440" }}
          >
            <AlertTriangle className="w-10 h-10 mx-auto mb-2" style={{ color: "#EF4444" }} />
            <p className="text-white font-bold mb-1">No encontramos esa cuenta</p>
            <p className="text-sm" style={{ color: "#9CA3AF" }}>
              Revisá el filtro de cuenta o volvé al panel principal.
            </p>
          </div>
        )}

        {error && (
          <div
            className="rounded-2xl p-4 mb-4 text-center"
            style={{ background: "#EF444418", border: "1px solid #EF444440" }}
          >
            <AlertTriangle className="w-7 h-7 mx-auto mb-1" style={{ color: "#EF4444" }} />
            <p className="text-sm text-white font-semibold">{error}</p>
          </div>
        )}

        {(loading || accountsLoading) && (
          <div className="rounded-2xl p-8 text-center" style={{ background: "#1F1F1F" }}>
            <RefreshCw className="w-8 h-8 mx-auto mb-3 animate-spin" style={{ color: "#FFE600" }} />
            <p className="text-white font-bold">Cargando reclamos unificados...</p>
          </div>
        )}

        {!loading && !accountsLoading && accountsForPage.length > 0 && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
              <div className="rounded-2xl p-4" style={{ background: "#1F1F1F", border: "1px solid rgba(255,255,255,0.07)" }}>
                <p className="text-xs mb-1" style={{ color: "#6B7280" }}>Reclamos abiertos</p>
                <p className="text-2xl font-black" style={{ color: "#EF4444" }}>{totals.claimsCount}</p>
              </div>
              <div className="rounded-2xl p-4" style={{ background: "#1F1F1F", border: "1px solid rgba(255,255,255,0.07)" }}>
                <p className="text-xs mb-1" style={{ color: "#6B7280" }}>Mediaciones</p>
                <p className="text-2xl font-black" style={{ color: "#FF5722" }}>{totals.mediationsCount}</p>
              </div>
              <div className="rounded-2xl p-4" style={{ background: "#1F1F1F", border: "1px solid rgba(255,255,255,0.07)" }}>
                <p className="text-xs mb-1" style={{ color: "#6B7280" }}>Mensajes en reclamos</p>
                <p className="text-2xl font-black" style={{ color: "#00E5FF" }}>{totals.messagesCount}</p>
              </div>
            </div>

            <div className="mb-4">
              <UnifiedPostSalePanel accounts={summaryMetrics} isLoading={loading} />
            </div>

            {filteredClaims.length > 0 && (
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  type="text"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Buscar por cuenta, comprador, reclamo o mensaje..."
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm text-white placeholder-gray-500 outline-none"
                  style={{ background: "#1F1F1F", border: "1px solid rgba(255,255,255,0.08)" }}
                />
              </div>
            )}

            <div className="space-y-3">
              {filteredClaims.length === 0 ? (
                <div className="rounded-2xl p-10 text-center" style={{ background: "#1F1F1F" }}>
                  <CheckCircle2 className="w-10 h-10 mx-auto mb-2" style={{ color: "#39FF14" }} />
                  <p className="text-white font-bold">{search ? "Sin resultados" : "Sin reclamos abiertos"}</p>
                  <p className="text-sm mt-1" style={{ color: "#6B7280" }}>
                    {search
                      ? "Probá con otra búsqueda."
                      : "Todas las cuentas están al día en post-venta."}
                  </p>
                </div>
              ) : (
                filteredClaims.map((claim) => (
                  <ClaimCard key={claim.claim_id} claim={claim} onUpdated={loadClaims} />
                ))
              )}
            </div>

            {!loading && filteredClaims.length > 0 && (
              <div className="mt-6 rounded-2xl p-4" style={{ background: "#1F1F1F", border: "1px solid rgba(255,255,255,0.07)" }}>
                <div className="flex items-center gap-2 mb-2">
                  <MessageSquare className="w-4 h-4" style={{ color: "#00E5FF" }} />
                  <p className="text-sm font-bold text-white">Gestión unificada real</p>
                </div>
                <p className="text-xs" style={{ color: "#9CA3AF" }}>
                  Desde esta vista podés responder y resolver reclamos de todas las cuentas sin cambiar de panel.
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}

export default function PostVentaPage() {
  return (
    <Suspense fallback={<div style={{ background: "#121212", minHeight: "100vh" }} />}>
      <PostVentaContent />
    </Suspense>
  );
}