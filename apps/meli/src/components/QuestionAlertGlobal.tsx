"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import { Bell, BellOff, ChevronDown } from "lucide-react";
import { ALERT_MODES, type AlertMode, ALERT_MODE_STORAGE_KEY } from "@/lib/alertModes";
import { supabase } from "@/lib/supabase";

/**
 * Verifica si las credenciales de Supabase están configuradas correctamente
 */
function hasValidSupabaseConfig(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return !!(
    url &&
    key &&
    !url.includes("placeholder") &&
    !key.includes("placeholder") &&
    url.startsWith("https://")
  );
}

/**
 * Global question-alert component.
 * 
 * Features:
 * - Polling cada 10 segundos para detectar nuevas preguntas
 * - Sonido de alerta configurable (3 modos: discreto, taller, urgente)
 * - Notificación visual tipo toast
 * - Persistencia de preferencias en localStorage
 * - Muestra contador de nuevas preguntas
 * 
 * El componente se monta típicamente en el layout principal para estar
 * disponible en toda la aplicación.
 */
export default function QuestionAlertGlobal() {
  const [enabled, setEnabled] = useState(false);
  const [newCount, setNewCount] = useState(0);
  const [toast, setToast] = useState<string | null>(null);
  const [alertMode, setAlertMode] = useState<AlertMode>("taller");
  const [showModeDropdown, setShowModeDropdown] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  const enabledRef = useRef(false);
  const alertedIdsRef = useRef<Set<number>>(new Set());
  const lastPollRef = useRef<Date | null>(null);
  const pollingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const alertModeRef = useRef<AlertMode>("taller");
  const playAlertSoundRef = useRef<(mode: AlertMode) => void>(() => {});
  const showBrowserNotificationRef = useRef<(title: string, body: string) => void>(() => {});

  // Actualizar refs cuando cambian las dependencias
  useEffect(() => {
    alertModeRef.current = alertMode;
  }, [alertMode]);

  const hasRealtimeSupport = hasValidSupabaseConfig();

  // Restore persisted preference on mount
  useEffect(() => {
    // Cargar preferencias guardadas
    const storedEnabled = localStorage.getItem("maqjeez_alerts_enabled");
    if (storedEnabled === "true") setEnabled(true);

    const storedMode = localStorage.getItem(ALERT_MODE_STORAGE_KEY) as AlertMode | null;
    if (storedMode && Object.keys(ALERT_MODES).includes(storedMode)) {
      setAlertMode(storedMode);
    }

    // PRELOAD: Cargar los 3 audios en RAM al montar el componente
    const audios: Record<AlertMode, HTMLAudioElement> = {
      discreto: new Audio("/sounds/alerta-discreto.mp3"),
      taller: new Audio("/sounds/alerta-taller.mp3"),
      urgente: new Audio("/sounds/alerta-urgente.mp3"),
    };

    // Configurar volumen máximo y forzar carga a RAM
    Object.entries(audios).forEach(([_, audio]) => {
      audio.volume = 1.0;
      audio.preload = "auto";
      audio.load();
    });

    (window as any).preloadedAudios = audios;

    // Solicitar permiso de notificaciones del navegador
    if (typeof Notification !== "undefined" && Notification.permission === "default") {
      Notification.requestPermission().catch(() => {});
    }

    setIsInitialized(true);
    console.log("[QuestionAlertGlobal] Inicializado con modo:", storedMode || "taller");
  }, []);

  // Keep ref in sync
  useEffect(() => {
    enabledRef.current = enabled;
    localStorage.setItem("maqjeez_alerts_enabled", String(enabled));
  }, [enabled]);

  // Sync alert mode with localStorage
  useEffect(() => {
    localStorage.setItem(ALERT_MODE_STORAGE_KEY, alertMode);
  }, [alertMode]);

  // Función para reproducir sonido de alerta usando PRELOAD
  const playAlertSound = useCallback((mode: AlertMode) => {
    try {
      if (!enabledRef.current) return;

      const audios = (window as any).preloadedAudios;
      if (!audios || !audios[mode]) {
        console.error("[Alert] Audio no precargado:", mode);
        return;
      }

      const audio = audios[mode];
      // Aplicar volumen configurado por modo (discreto=0.5, taller=0.5, urgente=1.0)
      const modeConfig = ALERT_MODES[mode];
      audio.volume = modeConfig?.volume ?? 1.0;
      audio.currentTime = 0;

      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.catch((e: Error) => {
          console.error("❌ Error reproduciendo audio:", e);
        });
      }

      console.log(`🔔 Alerta ${mode} reproducida`);
    } catch (error) {
      console.error("❌ Error en playAlertSound:", error);
    }
  }, []); // Sin dependencias - usa enabledRef

  // Sincronizar ref para que pollQuestions siempre tenga la versión actual
  useEffect(() => { playAlertSoundRef.current = playAlertSound; }, [playAlertSound]);

  // Función para mostrar notificación del navegador
  const showBrowserNotification = useCallback((title: string, body: string) => {
    if (typeof Notification !== "undefined" && Notification.permission === "granted" && enabledRef.current) {
      new Notification(title, {
        body,
        icon: "/icon-192x192.png",
        badge: "/icon-192x192.png",
        tag: "new-question",
        requireInteraction: true,
      });
    }
  }, []);

  // Sincronizar ref para que pollQuestions siempre tenga la versión actual
  useEffect(() => { showBrowserNotificationRef.current = showBrowserNotification; }, [showBrowserNotification]);

  // Función para mostrar notificación de cambio de modo
  const showModeNotification = useCallback((mode: AlertMode) => {
    const config = ALERT_MODES[mode];
    setToast(`${config.icon} Modo ${config.label} activado - Prueba de sonido realizada`);
    setTimeout(() => setToast(null), 4000);
  }, []);

  // POLLING: Verificar nuevas preguntas cada 10 segundos
  const pollQuestions = useCallback(async () => {
    try {
      console.log("[POLL] Verificando nuevas preguntas...");
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        console.log("[POLL] Sin sesion activa, omitiendo poll");
        return;
      }

      // Usa el endpoint unificado que consulta MeLi directamente (no Supabase)
      // Solo trae UNANSWERED para no contar preguntas ya respondidas como "nuevas"
      const res = await fetch(`/api/meli-questions-unified?status=UNANSWERED&_t=${Date.now()}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (!res.ok) {
        console.error("[POLL] Error en respuesta:", res.status);
        return;
      }

      const payload = await res.json();

      // Log por cuenta para diagnóstico
      for (const ar of payload?.questions ?? []) {
        const qCount = (ar.questions ?? []).length;
        if (ar.error) {
          console.warn(`[POLL] ${ar.nickname}: ${qCount} preguntas — ERROR: ${ar.error}`);
        } else {
          console.log(`[POLL] ${ar.nickname}: ${qCount} preguntas`);
        }
      }

      // Aplanar las preguntas de todas las cuentas al formato esperado
      const data: Array<{
        meli_question_id: number;
        question_text: string;
        item_title?: string;
        meli_accounts?: { nickname?: string };
        date_created: string;
      }> = [];

      for (const accountResult of payload?.questions ?? []) {
        for (const q of accountResult.questions ?? []) {
          data.push({
            meli_question_id: q.meli_question_id,
            question_text: q.question_text ?? "",
            item_title: q.item_title,
            meli_accounts: { nickname: accountResult.nickname },
            date_created: q.date_created,
          });
        }
      }

      console.log(`[POLL] ${data.length} preguntas encontradas`);

      // Filtrar duplicados
      const seen = new Set<number>();
      const unique = data.filter(q => {
        if (seen.has(q.meli_question_id)) return false;
        seen.add(q.meli_question_id);
        return true;
      });

      // Primera carga: solo guardar IDs sin alertar
      if (lastPollRef.current === null) {
        console.log("[POLL] Primera carga - guardando IDs sin alertar");
        unique.forEach(q => alertedIdsRef.current.add(q.meli_question_id));
        lastPollRef.current = new Date();
        return;
      }

      // Detectar nuevas preguntas
      let newQuestions = 0;
      const newAccounts: string[] = [];
      
      for (const q of unique) {
        if (!alertedIdsRef.current.has(q.meli_question_id)) {
          alertedIdsRef.current.add(q.meli_question_id);
          newQuestions++;
          const accName = q.meli_accounts?.nickname ?? "Cuenta";
          if (!newAccounts.includes(accName)) newAccounts.push(accName);
          
          console.log(`[POLL] Nueva pregunta detectada: ${q.meli_question_id} - ${q.question_text.substring(0, 50)}...`);
        }
      }

      if (newQuestions > 0) {
        console.log(`[POLL] ${newQuestions} nuevas preguntas!`);
        setNewCount(prev => prev + newQuestions);
        
        // Reproducir sonido si está habilitado
        if (enabledRef.current) {
          playAlertSoundRef.current(alertModeRef.current);
        }
        
        // Mostrar toast
        const toastMessage = `${newQuestions} pregunta${newQuestions > 1 ? "s" : ""} nueva${newQuestions > 1 ? "s" : ""} de ${newAccounts.join(", ")}`;
        setToast(toastMessage);
        setTimeout(() => setToast(null), ALERT_MODES[alertModeRef.current].duration);
        
        // Notificación del navegador
        showBrowserNotificationRef.current(
          "¡Nueva pregunta en Mercado Libre!",
          `${newQuestions} pregunta${newQuestions > 1 ? "s" : ""} nueva${newQuestions > 1 ? "s" : ""} de ${newAccounts.join(", ")}`
        );
      }

      lastPollRef.current = new Date();
    } catch (error) {
      console.error("[POLL] Error:", error);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Sin dependencias - usa refs para valores cambiantes

  // Configurar polling cuando se inicializa
  useEffect(() => {
    if (!isInitialized) return;

    // Primera carga inmediata
    pollQuestions();

    // Polling cada 10 segundos
    pollingIntervalRef.current = setInterval(() => {
      pollQuestions();
    }, 10000);

    console.log("[QuestionAlertGlobal] Polling iniciado (10s)");

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
      console.log("[QuestionAlertGlobal] Polling detenido");
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isInitialized]); // Solo iniciar cuando isInitialized cambia, no cuando pollQuestions cambia

  const handleEnable = () => {
    if (typeof Notification !== "undefined" && Notification.permission !== "denied") {
      Notification.requestPermission().catch(() => {});
    }
    setEnabled(true);
    // Reproducir sonido de prueba
    playAlertSound(alertMode);
  };

  const handleDisable = () => setEnabled(false);

  const handleModeChange = (mode: AlertMode) => {
    setAlertMode(mode);
    playAlertSound(mode);
    showModeNotification(mode);
    setShowModeDropdown(false);
  };

  // Si no está inicializado, no renderizar nada
  if (!isInitialized) return null;

  return (
    <>
      {/* Toast de alerta */}
      {toast && enabled && (
        <div 
          className={`fixed top-4 left-1/2 -translate-x-1/2 z-[100] ${ALERT_MODES[alertMode].animation}`}
        >
          <div 
            className={`${ALERT_MODES[alertMode].style} text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-4 border-2 border-white min-w-[300px]`}
          >
            <span className="text-3xl">{ALERT_MODES[alertMode].icon}</span>
            <div>
              <p className="font-black uppercase tracking-wider text-sm">¡Nueva Pregunta!</p>
              <p className="text-base font-medium">{toast}</p>
            </div>
            <button 
              onClick={() => setToast(null)}
              className="ml-2 p-1 rounded-full hover:bg-white/20"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* Floating alert controls — fixed bottom-right */}
      <div className="fixed bottom-4 right-4 z-50 flex items-center gap-2">
        {/* Contador de nuevas preguntas — clickeable para limpiar */}
        {newCount > 0 && (
          <button
            onClick={() => setNewCount(0)}
            className="relative flex items-center justify-center w-10 h-10 rounded-full transition-all hover:scale-110"
            style={{ background: "#ef4444", border: "2px solid #ef444460" }}
            title="Limpiar contador"
          >
            <span className="text-sm font-black text-white">
              {newCount > 99 ? "99+" : newCount}
            </span>
          </button>
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
                        onClick={() => handleModeChange(mode)}
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

// X icon component
function X({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}
