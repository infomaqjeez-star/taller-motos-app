"use client";

import { useState, useEffect, useCallback, useRef } from "react";

export interface AlarmConfig {
  flexAlarm: {
    hour: number;
    minute: number;
    enabled: boolean;
    message: string;
  };
  correoAlarm: {
    hour: number;
    minute: number;
    enabled: boolean;
    message: string;
  };
  workDays: boolean[]; // [lunes, martes, miercoles, jueves, viernes, sabado, domingo]
}

const DEFAULT_CONFIG: AlarmConfig = {
  flexAlarm: { hour: 12, minute: 0, enabled: true, message: "revisar flex" },
  correoAlarm: { hour: 17, minute: 0, enabled: true, message: "entregar correo" },
  workDays: [true, true, true, true, true, true, false], // Lun-Sab
};

const STORAGE_KEY = "maqjeez_alarm_config";

export function useAlarms() {
  const [config, setConfig] = useState<AlarmConfig>(DEFAULT_CONFIG);
  const [nextAlarm, setNextAlarm] = useState<{ type: string; time: Date; diff: number } | null>(null);
  const [flexAlarm, setFlexAlarm] = useState<{ time: Date; diff: number } | null>(null);
  const [correoAlarm, setCorreoAlarm] = useState<{ time: Date; diff: number } | null>(null);
  const lastPlayedRef = useRef<{ [key: string]: string }>({});

  // Cargar configuración guardada
  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setConfig({ ...DEFAULT_CONFIG, ...parsed });
      } catch { /* ignorar */ }
    }
  }, []);

  // Guardar configuración
  const saveConfig = useCallback((newConfig: AlarmConfig) => {
    setConfig(newConfig);
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newConfig));
    }
  }, []);

  // Función para hablar
  const speak = useCallback((text: string) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "es-AR";
    utterance.rate = 0.9;
    utterance.pitch = 1;
    utterance.volume = 1;

    // Buscar voz en español
    const voices = window.speechSynthesis.getVoices();
    const spanishVoice = voices.find(v => v.lang.startsWith("es"));
    if (spanishVoice) {
      utterance.voice = spanishVoice;
    }

    window.speechSynthesis.speak(utterance);
  }, []);

  // Revisar alarmas cada minuto
  useEffect(() => {
    if (typeof window === "undefined") return;

    const checkAlarms = () => {
      const now = new Date();
      const currentHour = now.getHours();
      const currentMinute = now.getMinutes();
      const currentDay = now.getDay(); // 0=domingo, 1=lunes, etc.
      const dayIndex = currentDay === 0 ? 6 : currentDay - 1; // Convertir a 0=lunes

      // No hacer nada si es domingo o día no laborable
      if (!config.workDays[dayIndex]) return;

      const timeKey = `${currentHour}:${currentMinute}`;

      // Verificar alarma de flex (12:00)
      if (config.flexAlarm.enabled) {
        const flexKey = `flex-${timeKey}`;
        if (
          currentHour === config.flexAlarm.hour &&
          currentMinute === config.flexAlarm.minute &&
          lastPlayedRef.current["flex"] !== timeKey
        ) {
          lastPlayedRef.current["flex"] = timeKey;
          speak(config.flexAlarm.message);
          
          // También mostrar alerta visual
          alert(`🔔 ALARMA: ${config.flexAlarm.message.toUpperCase()}`);
        }
      }

      // Verificar alarma de correo (17:00)
      if (config.correoAlarm.enabled) {
        const correoKey = `correo-${timeKey}`;
        if (
          currentHour === config.correoAlarm.hour &&
          currentMinute === config.correoAlarm.minute &&
          lastPlayedRef.current["correo"] !== timeKey
        ) {
          lastPlayedRef.current["correo"] = timeKey;
          speak(config.correoAlarm.message);
          
          // También mostrar alerta visual
          alert(`📦 ALARMA: ${config.correoAlarm.message.toUpperCase()}`);
        }
      }
    };

    // Calcular próxima alarma y horarios de corte
    const calculateAlarms = () => {
      const now = new Date();
      const currentHour = now.getHours();
      const currentMinute = now.getMinutes();
      const currentDay = now.getDay();
      const dayIndex = currentDay === 0 ? 6 : currentDay - 1;

      let nextFlex: Date | null = null;
      let nextCorreo: Date | null = null;

      // Buscar próxima alarma de flex
      if (config.flexAlarm.enabled) {
        const flexTime = new Date(now);
        flexTime.setHours(config.flexAlarm.hour, config.flexAlarm.minute, 0, 0);
        
        if (flexTime <= now) {
          flexTime.setDate(flexTime.getDate() + 1);
        }
        
        // Buscar día laborable
        while (!config.workDays[flexTime.getDay() === 0 ? 6 : flexTime.getDay() - 1]) {
          flexTime.setDate(flexTime.getDate() + 1);
        }
        
        nextFlex = flexTime;
      }

      // Buscar próxima alarma de correo
      if (config.correoAlarm.enabled) {
        const correoTime = new Date(now);
        correoTime.setHours(config.correoAlarm.hour, config.correoAlarm.minute, 0, 0);
        
        if (correoTime <= now) {
          correoTime.setDate(correoTime.getDate() + 1);
        }
        
        // Buscar día laborable
        while (!config.workDays[correoTime.getDay() === 0 ? 6 : correoTime.getDay() - 1]) {
          correoTime.setDate(correoTime.getDate() + 1);
        }
        
        nextCorreo = correoTime;
      }

      // Determinar cuál es la próxima
      let next: { type: string; time: Date; diff: number } | null = null;
      
      if (nextFlex && nextCorreo) {
        if (nextFlex < nextCorreo) {
          next = { type: "Flex", time: nextFlex, diff: nextFlex.getTime() - now.getTime() };
        } else {
          next = { type: "Correo", time: nextCorreo, diff: nextCorreo.getTime() - now.getTime() };
        }
      } else if (nextFlex) {
        next = { type: "Flex", time: nextFlex, diff: nextFlex.getTime() - now.getTime() };
      } else if (nextCorreo) {
        next = { type: "Correo", time: nextCorreo, diff: nextCorreo.getTime() - now.getTime() };
      }

      setNextAlarm(next);
      
      // Actualizar alarmas individuales
      if (nextFlex) {
        setFlexAlarm({ time: nextFlex, diff: nextFlex.getTime() - now.getTime() });
      } else {
        setFlexAlarm(null);
      }
      
      if (nextCorreo) {
        setCorreoAlarm({ time: nextCorreo, diff: nextCorreo.getTime() - now.getTime() });
      } else {
        setCorreoAlarm(null);
      }
    };

    checkAlarms();
    calculateAlarms();

    const interval = setInterval(() => {
      checkAlarms();
      calculateAlarms();
    }, 10000); // Revisar cada 10 segundos

    return () => clearInterval(interval);
  }, [config, speak]);

  // Formatear tiempo restante
  const formatCountdown = useCallback((ms: number): string => {
    if (ms <= 0) return "00:00:00";
    
    const hours = Math.floor(ms / (1000 * 60 * 60));
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((ms % (1000 * 60)) / 1000);
    
    return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  }, []);

  return {
    config,
    saveConfig,
    nextAlarm,
    flexAlarm,
    correoAlarm,
    formatCountdown,
    speak,
  };
}
