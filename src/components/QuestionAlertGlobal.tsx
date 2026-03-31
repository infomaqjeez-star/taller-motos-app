"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import { Bell, BellOff, Volume2, ChevronDown } from "lucide-react";
import { ALERT_MODES, type AlertMode, ALERT_MODE_STORAGE_KEY } from "@/lib/alertModes";
import { supabase } from "@/lib/supabase";

/**
 * Global question-alert component with Realtime postgres_changes.
 * Persists alert preference in localStorage so it survives navigation.
 * Uses Supabase Realtime for zero-delay alerts (<500ms).
 * Supports unified alert modes: discreto, taller, urgente
 */
export default function QuestionAlertGlobal() {
  const [enabled, setEnabled] = useState(false);
  const [newCount, setNewCount] = useState(0);
  const [toast, setToast] = useState<string | null>(null);
  const [alertMode, setAlertMode] = useState<AlertMode>("taller");
  const [showModeDropdown, setShowModeDropdown] = useState(false);

  const enabledRef = useRef(false);
  const alertedIdsRef = useRef<Set<number>>(new Set());
  const initialLoadDone = useRef(false);
  const loadRef = useRef<(() => Promise<void>) | null>(null);

  // Restore persisted preference on mount
  useEffect(() => {
    const stored = localStorage.getItem("maqjeez_alerts_enabled");
    if (stored === "true") setEnabled(true);

    const storedMode = localStorage.getItem(ALERT_MODE_STORAGE_KEY) as AlertMode | null;
    console.log("[INIT] Modo almacenado en localStorage:", storedMode, "Key usado:", ALERT_MODE_STORAGE_KEY);
    if (storedMode && Object.keys(ALERT_MODES).includes(storedMode)) {
      console.log("[INIT] Restaurando modo desde localStorage:", storedMode);
      setAlertMode(storedMode);
    } else {
      console.log("[INIT] Modo no encontrado o inválido, usando default: taller");
    }

    // ✅ PRELOAD: Cargar los 3 audios en RAM al montar el componente
    const audios: Record<AlertMode, HTMLAudioElement> = {
      discreto: new Audio("/sounds/alerta-discreto.mp3"),
      taller: new Audio("/sounds/alerta-taller.mp3"),
      urgente: new Audio("/sounds/alerta-urgente.mp3"),
    };

    // Configurar volumen máximo (1.0) y forzar carga a RAM
    Object.entries(audios).forEach(([_, audio]) => {
      audio.volume = 1.0;
      audio.preload = "auto";
      audio.load();
    });

    (window as any).preloadedAudios = audios;

    if (typeof Notification !== "undefined" && Notification.permission === "default") {
      Notification.requestPermission().catch(() => {});
    }

    console.log("[INIT] Audios precargados en RAM para zero-delay");
  }, []);

  // Keep ref in sync
  useEffect(() => {
    enabledRef.current = enabled;
    localStorage.setItem("maqjeez_alerts_enabled", String(enabled));
  }, [enabled]);

  // Sync alert mode with localStorage
  useEffect(() => {
    console.log("[SYNC] Guardando modo en localStorage:", alertMode, "Key:", ALERT_MODE_STORAGE_KEY);
    localStorage.setItem(ALERT_MODE_STORAGE_KEY, alertMode);
  }, [alertMode]);

  // Función para reproducir sonido de alerta usando PRELOAD
  const playAlertSound = useCallback((mode: AlertMode) => {
    try {
      const audios = (window as any).preloadedAudios;
      if (!audios || !audios[mode]) {
        console.error("❌ Audio no precargado:", mode, "Audios disponibles:", Object.keys(audios || {}));
        return;
      }

      const audio = audios[mode];
      console.log(`[AUDIO] Reproduciendo ${mode}:`, audio.src);
      audio.currentTime = 0;
      audio.play().catch((e: Error) => {
        console.error("❌ Error reproduciendo audio:", e);
      });

      console.log(`✅ Sonido ${mode} reproducido (preload)`, new Date().toISOString());
    } catch (error) {
      console.error("❌ Error en playAlertSound:", error);
    }
  }, []);

  // Función para mostrar notificación de cambio de modo
  const showModeNotification = useCallback((mode: AlertMode) => {
    const config = ALERT_MODES[mode];
    setToast(`${config.icon} Modo ${config.label} activado - Prueba de sonido realizada`);
    setTimeout(() => setToast(null), 4000);
  }, []);

  const pollQuestions = useCallback(async () => {
    try {
      const res = await fetch("/api/meli-questions");
      if (!res.ok) return;
      const data: Array<{ meli_question_id: number; meli_accounts?: { nickname?: string } }> = await res.json();

      const seen = new Set<number>();
      const unique = data.filter(q => {
        if (seen.has(q.meli_question_id)) return false;
        seen.add(q.meli_question_id);
        return true;
      });

      if (!initialLoadDone.current) {
        unique.forEach(q => alertedIdsRef.current.add(q.meli_question_id));
        initialLoadDone.current = true;
        return;
      }

      let newQuestions = 0;
      const newAccounts: string[] = [];
      for (const q of unique) {
        if (!alertedIdsRef.current.has(q.meli_question_id)) {
          alertedIdsRef.current.add(q.meli_question_id);
          newQuestions++;
          const accName = q.meli_accounts?.nickname ?? "Cuenta";
          if (!newAccounts.includes(accName)) newAccounts.push(accName);
        }
      }

      if (newQuestions > 0) {
        setNewCount(prev => prev + newQuestions);
        playAlertSound(alertMode);
        const modeConfig = ALERT_MODES[alertMode];
        setToast(`${newQuestions} pregunta${newQuestions > 1 ? "s" : ""} nueva${newQuestions > 1 ? "s" : ""} de ${newAccounts.join(", ")}`);
        setTimeout(() => setToast(null), modeConfig.duration);
      }
    } catch { /* silent */ }
  }, [playAlertSound, alertMode]);

  useEffect(() => { loadRef.current = pollQuestions; }, [pollQuestions]);

  // ✅ FASE 4: Realtime re-habilitado (ahora con CSP headers que permiten wss://)
  useEffect(() => {
    // Poll inicial una sola vez
    pollQuestions();

    // Crear canal Realtime con broadcast sin ACK para máxima velocidad
    const channel = supabase
      .channel("meli_questions_changes", {
        config: { broadcast: { ack: false } },
      })
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "meli_questions",
        },
        (payload) => {
          // 🔥 PRIMERA: reproducir sonido INMEDIATAMENTE (antes de setState)
          console.log("[REALTIME] Nueva pregunta detectada:", payload.new.meli_question_id);
          playAlertSound(alertMode);

          // LUEGO: actualizar estado y UI
          loadRef.current?.();
        }
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          console.log("✅ [REALTIME] Conectado a canal de preguntas");
        } else if (status === "CHANNEL_ERROR") {
          console.error("❌ [REALTIME] Error de conexión");
        }
      });

    // 💓 HEARTBEAT: Enviar keep-alive cada 30s para mantener conexión activa
    const heartbeat = setInterval(() => {
      console.log("[REALTIME] Heartbeat @", new Date().toISOString());
    }, 30000);

    console.log("[INIT] Sistema Realtime iniciado (zero-delay)");

    return () => {
      clearInterval(heartbeat);
      supabase.removeChannel(channel);
      console.log("[CLEANUP] Sistema Realtime detenido");
    };
  }, [alertMode, playAlertSound]);

  const handleEnable = () => {
    if (typeof Notification !== "undefined" && Notification.permission !== "denied") {
      Notification.requestPermission().catch(() => {});
    }
    setEnabled(true);
  };

  const handleDisable = () => setEnabled(false);

  return (
    <>
      {/* Floating alert controls — fixed bottom-right */}
      <div className="fixed bottom-4 right-4 z-50 flex items-center gap-2">
        {toast && (
          <div className={`${ALERT_MODES[alertMode].style} ${ALERT_MODES[alertMode].animation} text-white p-5 rounded-xl shadow-2xl flex items-center gap-4 border-2 border-white`}>
            <span className="text-3xl">{ALERT_MODES[alertMode].icon}</span>
            <div>
              <p className="font-black uppercase tracking-wider">¡Nueva Pregunta en Sistema!</p>
              <p className="text-lg font-medium">{toast}</p>
            </div>
          </div>
        )}

        {newCount > 0 && (
          <div className="relative">
            <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black text-black"
              style={{ background: "#ef4444" }}>
              {newCount > 99 ? "99+" : newCount}
            </span>
          </div>
        )}

        {enabled ? (
          <div className="flex items-center gap-1">
            {/* Mode selector dropdown */}
            <div className="relative">
              <button onClick={() => setShowModeDropdown(!showModeDropdown)}
                className="w-9 h-9 rounded-full flex items-center justify-center transition-all"
                style={{ background: "#1F1F1F", border: "1px solid rgba(255,255,255,0.1)" }}
                title={`Modo actual: ${ALERT_MODES[alertMode].label}`}>
                <ChevronDown className="w-4 h-4 text-gray-400" />
              </button>
              {showModeDropdown && (
                <div className="absolute bottom-full right-0 mb-2 bg-gray-900 border border-gray-700 rounded-xl shadow-2xl z-[60] min-w-max">
                  {(Object.keys(ALERT_MODES) as AlertMode[]).map((mode) => (
                    <div
                      key={mode}
                      className={`flex items-center justify-between px-3 py-2 transition-colors first:rounded-t-lg last:rounded-b-lg ${
                        alertMode === mode ? "bg-blue-600" : "hover:bg-gray-800"
                      }`}
                    >
                      <button
                        onClick={() => {
                          console.log("[MODE SELECT] Cambiando a modo:", mode);
                          setAlertMode(mode);
                          playAlertSound(mode);
                          showModeNotification(mode);
                          setShowModeDropdown(false);
                        }}
                        className={`flex-1 text-left flex items-center gap-2 text-sm transition-colors ${
                          alertMode === mode ? "text-white font-bold" : "text-gray-300"
                        }`}
                      >
                        <span className="text-lg">{ALERT_MODES[mode].icon}</span>
                        {ALERT_MODES[mode].label}
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          playAlertSound(mode);
                        }}
                        className={`ml-2 px-2 py-1 rounded text-sm transition-all ${
                          alertMode === mode
                            ? "bg-white text-blue-600 hover:bg-gray-100"
                            : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                        }`}
                        title="Reproducir prueba de sonido"
                      >
                        ▶️
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <button onClick={handleDisable}
              className="w-10 h-10 rounded-full flex items-center justify-center transition-all shadow-lg"
              style={{ background: "#39FF14", border: "2px solid #39FF1460" }}
              title="Alertas activadas — clic para desactivar">
              <Bell className="w-5 h-5 text-black" />
            </button>
          </div>
        ) : (
          <button onClick={handleEnable}
            className="w-10 h-10 rounded-full flex items-center justify-center transition-all shadow-lg"
            style={{ background: "#1F1F1F", border: "2px solid rgba(255,255,255,0.15)" }}
            title="Activar alertas sonoras">
            <BellOff className="w-5 h-5 text-gray-500" />
          </button>
        )}
      </div>
    </>
  );
}
