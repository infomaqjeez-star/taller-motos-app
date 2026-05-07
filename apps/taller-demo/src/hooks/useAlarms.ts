"use client";

import { useState, useEffect, useCallback, useRef } from "react";

export interface SingleAlarm {
  hour: number;
  minute: number;
  enabled: boolean;
  message: string;
  id: string;
}

export interface AlarmConfig {
  flexAlarms: SingleAlarm[];
  correoAlarms: SingleAlarm[];
  danielaAlarm: SingleAlarm;
  workDays: boolean[]; // [lunes, martes, miercoles, jueves, viernes, sabado, domingo]
}

const DEFAULT_CONFIG: AlarmConfig = {
  flexAlarms: [
    { hour: 11, minute: 51, enabled: true, message: "chequear flex", id: "flex-10min-before" },
    { hour: 11, minute: 56, enabled: true, message: "chequear flex", id: "flex-5min-before" },
    { hour: 12, minute: 1, enabled: true, message: "chequear flex", id: "flex-corte" },
    { hour: 12, minute: 10, enabled: true, message: "chequear flex", id: "flex-10min-after" },
  ],
  correoAlarms: [
    { hour: 17, minute: 0, enabled: true, message: "avisar a oscar de entregar correo", id: "correo-main" },
  ],
  danielaAlarm: { hour: 12, minute: 0, enabled: true, message: "daniela ponete las pilas y revisa flex", id: "daniela" },
  workDays: [true, true, true, true, true, true, false], // Lun-Sab
};

const STORAGE_KEY = "maqjeez_alarm_config";

export function useAlarms() {
  const [config, setConfig] = useState<AlarmConfig>(DEFAULT_CONFIG);
  const [nextAlarm, setNextAlarm] = useState<{ type: string; time: Date; diff: number } | null>(null);
  const [flexAlarm, setFlexAlarm] = useState<{ time: Date; diff: number } | null>(null);
  const [correoAlarm, setCorreoAlarm] = useState<{ time: Date; diff: number } | null>(null);
  const [danielaAlarm, setDanielaAlarm] = useState<{ time: Date; diff: number } | null>(null);
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

      // Verificar alarmas de flex
      config.flexAlarms.forEach(alarm => {
        if (alarm.enabled) {
          const alarmKey = `flex-${alarm.id}-${timeKey}`;
          if (
            currentHour === alarm.hour &&
            currentMinute === alarm.minute &&
            lastPlayedRef.current[alarmKey] !== timeKey
          ) {
            lastPlayedRef.current[alarmKey] = timeKey;
            speak(alarm.message);
            alert(`🔔 FLEX: ${alarm.message.toUpperCase()}`);
          }
        }
      });

      // Verificar alarmas de correo
      config.correoAlarms.forEach(alarm => {
        if (alarm.enabled) {
          const alarmKey = `correo-${alarm.id}-${timeKey}`;
          if (
            currentHour === alarm.hour &&
            currentMinute === alarm.minute &&
            lastPlayedRef.current[alarmKey] !== timeKey
          ) {
            lastPlayedRef.current[alarmKey] = timeKey;
            speak(alarm.message);
            alert(`� CORREO: ${alarm.message.toUpperCase()}`);
          }
        }
      });

      // Verificar alarma de Daniela
      if (config.danielaAlarm.enabled) {
        const alarmKey = `daniela-${timeKey}`;
        if (
          currentHour === config.danielaAlarm.hour &&
          currentMinute === config.danielaAlarm.minute &&
          lastPlayedRef.current[alarmKey] !== timeKey
        ) {
          lastPlayedRef.current[alarmKey] = timeKey;
          speak(config.danielaAlarm.message);
          alert(`� DANIELA: ${config.danielaAlarm.message.toUpperCase()}`);
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
      let nextDaniela: Date | null = null;

      // Buscar próxima alarma de flex
      const allFlexTimes: Date[] = [];
      config.flexAlarms.forEach(alarm => {
        if (alarm.enabled) {
          const flexTime = new Date(now);
          flexTime.setHours(alarm.hour, alarm.minute, 0, 0);

          if (flexTime <= now) {
            flexTime.setDate(flexTime.getDate() + 1);
          }

          // Buscar día laborable
          while (!config.workDays[flexTime.getDay() === 0 ? 6 : flexTime.getDay() - 1]) {
            flexTime.setDate(flexTime.getDate() + 1);
          }

          allFlexTimes.push(flexTime);
        }
      });

      if (allFlexTimes.length > 0) {
        nextFlex = allFlexTimes.reduce((a, b) => (a < b ? a : b));
      }

      // Buscar próxima alarma de correo
      const allCorreoTimes: Date[] = [];
      config.correoAlarms.forEach(alarm => {
        if (alarm.enabled) {
          const correoTime = new Date(now);
          correoTime.setHours(alarm.hour, alarm.minute, 0, 0);

          if (correoTime <= now) {
            correoTime.setDate(correoTime.getDate() + 1);
          }

          // Buscar día laborable
          while (!config.workDays[correoTime.getDay() === 0 ? 6 : correoTime.getDay() - 1]) {
            correoTime.setDate(correoTime.getDate() + 1);
          }

          allCorreoTimes.push(correoTime);
        }
      });

      if (allCorreoTimes.length > 0) {
        nextCorreo = allCorreoTimes.reduce((a, b) => (a < b ? a : b));
      }

      // Buscar próxima alarma de Daniela
      if (config.danielaAlarm.enabled) {
        const danielaTime = new Date(now);
        danielaTime.setHours(config.danielaAlarm.hour, config.danielaAlarm.minute, 0, 0);

        if (danielaTime <= now) {
          danielaTime.setDate(danielaTime.getDate() + 1);
        }

        // Buscar día laborable
        while (!config.workDays[danielaTime.getDay() === 0 ? 6 : danielaTime.getDay() - 1]) {
          danielaTime.setDate(danielaTime.getDate() + 1);
        }

        nextDaniela = danielaTime;
      }

      // Determinar cuál es la próxima
      const allTimes: { type: string; time: Date }[] = [];
      if (nextFlex) allTimes.push({ type: "Flex", time: nextFlex });
      if (nextCorreo) allTimes.push({ type: "Correo", time: nextCorreo });
      if (nextDaniela) allTimes.push({ type: "Daniela", time: nextDaniela });

      let next: { type: string; time: Date; diff: number } | null = null;
      if (allTimes.length > 0) {
        const earliest = allTimes.reduce((a, b) => (a.time < b.time ? a : b));
        next = { type: earliest.type, time: earliest.time, diff: earliest.time.getTime() - now.getTime() };
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

      if (nextDaniela) {
        setDanielaAlarm({ time: nextDaniela, diff: nextDaniela.getTime() - now.getTime() });
      } else {
        setDanielaAlarm(null);
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
    danielaAlarm,
    formatCountdown,
    speak,
  };
}
