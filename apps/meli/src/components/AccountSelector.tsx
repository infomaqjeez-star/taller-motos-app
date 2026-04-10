"use client";

import { ChevronDown, AlertCircle } from "lucide-react";
import { useState } from "react";

interface AccountDash {
  account: string;
  meli_user_id: string;
  unanswered_questions: number;
  pending_messages: number;
  ready_to_ship: number;
  claims_count: number;
  reputation: {
    level_id: string | null;
    power_seller_status: string | null;
  };
}

interface Props {
  accounts: AccountDash[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  compact?: boolean;
}

const LEVEL_COLORS: Record<string, string> = {
  "1_red": "#ef4444",
  "2_orange": "#FF5722",
  "3_yellow": "#FFE600",
  "4_light_green": "#7CFC00",
  "5_green": "#39FF14",
};

const LEVEL_LABELS: Record<string, string> = {
  "1_red": "Rojo",
  "2_orange": "Naranja",
  "3_yellow": "Amarillo",
  "4_light_green": "Verde claro",
  "5_green": "Verde",
};

const POWER_SELLER_COLORS: Record<string, { bg: string; text: string }> = {
  platinum: { bg: "#FFD700", text: "#121212" },      // Dorado relleno
  gold:     { bg: "#C0C0C0", text: "#121212" },      // Plateado relleno
  silver:   { bg: "#2196F3", text: "#FFFFFF" },       // Azul relleno
};

const POWER_SELLER_LABELS: Record<string, string> = {
  platinum: "Platinum",
  gold: "Gold",
  silver: "MercadoLÃ­der",
};

export default function AccountSelector({ accounts, selectedId, onSelect, compact }: Props) {
  const [isOpen, setIsOpen] = useState(false);

  // Ordenar cuentas alfabÃ©ticamente por nombre
  const sorted = [...accounts].sort((a, b) => a.account.localeCompare(b.account));

  const selectedAccount = sorted.find((a) => a.meli_user_id === selectedId);

  if (accounts.length === 0) {
    return null;
  }

  // Calcular urgencia de cada cuenta
  const getUrgency = (acc: AccountDash) => {
    const total = (acc.unanswered_questions ?? 0) + (acc.ready_to_ship ?? 0) + (acc.pending_messages ?? 0) + (acc.claims_count ?? 0);
    return total;
  };

  // ===== VERSIÃ“N COMPACTA (para header) =====
  if (compact) {
    return (
      <div className="relative inline-block">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="px-2 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all"
          style={{
            background: "#FFE60022",
            border: `1px solid ${isOpen ? "#FFE600" : "#FFE60044"}`,
            color: "#FFE600",
          }}
        >
          @{selectedAccount?.account ?? "â€”"}
          <ChevronDown className="w-3 h-3" />
        </button>

        {/* Dropdown */}
        {isOpen && (
          <div
            className="absolute top-full right-0 mt-1 rounded-lg shadow-2xl z-50 max-h-96 overflow-y-auto w-56"
            style={{ background: "#181818", border: "1px solid rgba(255,255,255,0.08)" }}
          >
            {sorted.map((acc) => {
              const urgency = getUrgency(acc);
              const isSelected = acc.meli_user_id === selectedId;
              const repColor = acc.reputation.level_id ? LEVEL_COLORS[acc.reputation.level_id] : "#6B7280";

              return (
                <button
                  key={acc.meli_user_id}
                  onClick={() => {
                    onSelect(acc.meli_user_id);
                    setIsOpen(false);
                  }}
                  className="w-full px-3 py-2.5 flex items-center justify-between text-left transition-all hover:bg-opacity-100 text-xs"
                  style={{
                    background: isSelected ? "rgba(255, 230, 0, 0.1)" : "transparent",
                    borderBottom: "1px solid rgba(255,255,255,0.05)",
                  }}
                >
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <div
                      className="w-6 h-6 rounded flex items-center justify-center text-[9px] font-black flex-shrink-0"
                      style={{ background: repColor + "22", color: repColor }}
                    >
                      ðŸ“¦
                    </div>
                    <p className="font-bold text-white truncate">@{acc.account}</p>
                    {acc.reputation.power_seller_status && POWER_SELLER_COLORS[acc.reputation.power_seller_status] && (
                      <span
                        className="text-[8px] font-black px-1.5 py-0.5 rounded flex-shrink-0"
                        style={{
                          background: POWER_SELLER_COLORS[acc.reputation.power_seller_status].bg,
                          color: POWER_SELLER_COLORS[acc.reputation.power_seller_status].text,
                        }}
                      >
                        {POWER_SELLER_LABELS[acc.reputation.power_seller_status]}
                      </span>
                    )}
                  </div>
                  {urgency > 0 && (
                    <span className="text-[9px] font-bold flex-shrink-0 ml-1" style={{ color: "#EF4444" }}>
                      {urgency}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* Backdrop */}
        {isOpen && (
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
        )}
      </div>
    );
  }

  // ===== VERSIÃ“N FULL (original) =====
  return (
    <div className="relative mb-4">
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-3 rounded-lg flex items-center justify-between text-left transition-all hover:border-opacity-50"
        style={{
          background: "#1F1F1F",
          border: `1px solid ${isOpen ? "#FFE600" : "rgba(255,255,255,0.08)"}`,
        }}
      >
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {selectedAccount ? (
            <>
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center font-black text-sm flex-shrink-0"
                style={{ background: "linear-gradient(135deg,#FFE600,#FF9800)" }}
              >
                ðŸ“¦
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-white truncate">
                  @{selectedAccount.account}
                </p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  {selectedAccount.reputation.level_id && (
                    <span
                      className="text-[10px] font-bold px-1.5 py-0.5 rounded"
                      style={{
                        background: LEVEL_COLORS[selectedAccount.reputation.level_id] + "22",
                        color: LEVEL_COLORS[selectedAccount.reputation.level_id],
                        border: `1px solid ${LEVEL_COLORS[selectedAccount.reputation.level_id]}44`,
                      }}
                    >
                      {LEVEL_LABELS[selectedAccount.reputation.level_id]}
                    </span>
                  )}
                  {selectedAccount.reputation.power_seller_status && (
                    (() => {
                      const ps = POWER_SELLER_COLORS[selectedAccount.reputation.power_seller_status];
                      const c = ps ?? { bg: "#9C27B0", text: "#FFFFFF" };
                      return (
                        <span
                          className="text-[10px] font-bold px-1.5 py-0.5 rounded"
                          style={{
                            background: c.bg,
                            color: c.text,
                            border: `1px solid ${c.bg}`,
                          }}
                        >
                          {POWER_SELLER_LABELS[selectedAccount.reputation.power_seller_status] || selectedAccount.reputation.power_seller_status}
                        </span>
                      );
                    })()
                  )}
                </div>
              </div>
            </>
          ) : (
            <span className="text-gray-400">Selecciona una cuenta...</span>
          )}
        </div>
        <ChevronDown
          className="w-4 h-4 flex-shrink-0 transition-transform"
          style={{
            color: "#FFE600",
            transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
          }}
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          className="absolute top-full left-0 right-0 mt-2 rounded-lg shadow-2xl z-50 max-h-96 overflow-y-auto"
          style={{ background: "#181818", border: "1px solid rgba(255,255,255,0.08)" }}
        >
          {sorted.map((acc) => {
            const urgency = getUrgency(acc);
            const isSelected = acc.meli_user_id === selectedId;
            const repColor = acc.reputation.level_id ? LEVEL_COLORS[acc.reputation.level_id] : "#6B7280";

            return (
              <button
                key={acc.meli_user_id}
                onClick={() => {
                  onSelect(acc.meli_user_id);
                  setIsOpen(false);
                }}
                className="w-full px-4 py-3 flex items-center justify-between text-left transition-all hover:bg-opacity-100"
                style={{
                  background: isSelected ? "rgba(255, 230, 0, 0.1)" : "transparent",
                  borderBottom: "1px solid rgba(255,255,255,0.05)",
                }}
              >
                <div className="flex items-center gap-2.5 flex-1 min-w-0">
                  <div
                    className="w-8 h-8 rounded flex items-center justify-center text-xs font-black flex-shrink-0"
                    style={{ background: repColor + "22", color: repColor }}
                  >
                    ðŸ“¦
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-white truncate">@{acc.account}</p>
                    <p className="text-[10px] text-gray-500">
                      {acc.account}
                    </p>
                  </div>
                </div>

                {/* Urgencia Badge */}
                {urgency > 0 && (
                  <div className="flex items-center gap-1.5 flex-shrink-0 ml-2">
                    <AlertCircle className="w-3.5 h-3.5" style={{ color: "#EF4444" }} />
                    <span className="text-xs font-bold" style={{ color: "#EF4444" }}>
                      {urgency}
                    </span>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Backdrop para cerrar dropdown */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
}
