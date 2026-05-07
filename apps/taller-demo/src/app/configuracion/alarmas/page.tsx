"use client";

import { useState } from "react";
import { Clock, Bell, Save, Volume2, Play, X } from "lucide-react";
import Navbar from "@/components/Navbar";
import { useAlarms, AlarmConfig } from "@/hooks/useAlarms";

const DAYS_LABELS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];

export default function AlarmConfigPage() {
  const { config, saveConfig, speak } = useAlarms();
  const [localConfig, setLocalConfig] = useState<AlarmConfig>(config);
  const [playing, setPlaying] = useState<string | null>(null);

  const handleSave = () => {
    saveConfig(localConfig);
    alert("✅ Configuración de alarmas guardada");
  };

  const handleTestVoice = (message: string) => {
    setPlaying(message);
    speak(message);
    setTimeout(() => setPlaying(null), 3000);
  };

  const handleDayToggle = (index: number) => {
    setLocalConfig(prev => ({
      ...prev,
      workDays: prev.workDays.map((d, i) => i === index ? !d : d),
    }));
  };

  return (
    <>
      <Navbar />
      <main className="max-w-3xl mx-auto px-4 py-8 pb-24">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-200 flex items-center gap-2">
            <Bell className="w-6 h-6 text-[#FDB71A]" />
            Configuración de Alarmas
          </h1>
          <p className="text-gray-400 mt-1">Configura los horarios de las alarmas sonoras y los días laborables</p>
        </div>

        <div className="space-y-6">
          {/* Alarma de Flex */}
          <div className="card border border-white/10">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-200 flex items-center gap-2">
                <Clock className="w-5 h-5 text-orange-400" />
                Alarma de Flex
              </h2>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={localConfig.flexAlarm.enabled}
                  onChange={(e) => setLocalConfig(prev => ({
                    ...prev,
                    flexAlarm: { ...prev.flexAlarm, enabled: e.target.checked },
                  }))}
                  className="w-5 h-5 rounded"
                />
                <span className="text-sm font-semibold text-gray-300">Activar</span>
              </label>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-4">
              <div>
                <label className="label">Hora</label>
                <input
                  type="number"
                  min="0"
                  max="23"
                  className="input"
                  value={localConfig.flexAlarm.hour}
                  onChange={(e) => setLocalConfig(prev => ({
                    ...prev,
                    flexAlarm: { ...prev.flexAlarm, hour: parseInt(e.target.value) || 0 },
                  }))}
                />
              </div>
              <div>
                <label className="label">Minuto</label>
                <input
                  type="number"
                  min="0"
                  max="59"
                  className="input"
                  value={localConfig.flexAlarm.minute}
                  onChange={(e) => setLocalConfig(prev => ({
                    ...prev,
                    flexAlarm: { ...prev.flexAlarm, minute: parseInt(e.target.value) || 0 },
                  }))}
                />
              </div>
            </div>

            <div className="mb-4">
              <label className="label">Mensaje de voz</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  className="input flex-1"
                  value={localConfig.flexAlarm.message}
                  onChange={(e) => setLocalConfig(prev => ({
                    ...prev,
                    flexAlarm: { ...prev.flexAlarm, message: e.target.value },
                  }))}
                />
                <button
                  onClick={() => handleTestVoice(localConfig.flexAlarm.message)}
                  disabled={playing === localConfig.flexAlarm.message}
                  className="btn-secondary px-4 flex items-center gap-2"
                >
                  <Play className="w-4 h-4" />
                  {playing === localConfig.flexAlarm.message ? "Reproduciendo..." : "Probar"}
                </button>
              </div>
            </div>

            <div className="p-3 bg-orange-500/10 border border-orange-500/30 rounded-xl">
              <p className="text-sm text-orange-300">
                ⏰ Horario actual: <span className="font-bold">
                  {String(localConfig.flexAlarm.hour).padStart(2, "0")}:
                  {String(localConfig.flexAlarm.minute).padStart(2, "0")}
                </span> hs
              </p>
            </div>
          </div>

          {/* Alarma de Correo */}
          <div className="card border border-white/10">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-200 flex items-center gap-2">
                <Clock className="w-5 h-5 text-blue-400" />
                Alarma de Correo
              </h2>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={localConfig.correoAlarm.enabled}
                  onChange={(e) => setLocalConfig(prev => ({
                    ...prev,
                    correoAlarm: { ...prev.correoAlarm, enabled: e.target.checked },
                  }))}
                  className="w-5 h-5 rounded"
                />
                <span className="text-sm font-semibold text-gray-300">Activar</span>
              </label>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-4">
              <div>
                <label className="label">Hora</label>
                <input
                  type="number"
                  min="0"
                  max="23"
                  className="input"
                  value={localConfig.correoAlarm.hour}
                  onChange={(e) => setLocalConfig(prev => ({
                    ...prev,
                    correoAlarm: { ...prev.correoAlarm, hour: parseInt(e.target.value) || 0 },
                  }))}
                />
              </div>
              <div>
                <label className="label">Minuto</label>
                <input
                  type="number"
                  min="0"
                  max="59"
                  className="input"
                  value={localConfig.correoAlarm.minute}
                  onChange={(e) => setLocalConfig(prev => ({
                    ...prev,
                    correoAlarm: { ...prev.correoAlarm, minute: parseInt(e.target.value) || 0 },
                  }))}
                />
              </div>
            </div>

            <div className="mb-4">
              <label className="label">Mensaje de voz</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  className="input flex-1"
                  value={localConfig.correoAlarm.message}
                  onChange={(e) => setLocalConfig(prev => ({
                    ...prev,
                    correoAlarm: { ...prev.correoAlarm, message: e.target.value },
                  }))}
                />
                <button
                  onClick={() => handleTestVoice(localConfig.correoAlarm.message)}
                  disabled={playing === localConfig.correoAlarm.message}
                  className="btn-secondary px-4 flex items-center gap-2"
                >
                  <Play className="w-4 h-4" />
                  {playing === localConfig.correoAlarm.message ? "Reproduciendo..." : "Probar"}
                </button>
              </div>
            </div>

            <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-xl">
              <p className="text-sm text-blue-300">
                ⏰ Horario actual: <span className="font-bold">
                  {String(localConfig.correoAlarm.hour).padStart(2, "0")}:
                  {String(localConfig.correoAlarm.minute).padStart(2, "0")}
                </span> hs
              </p>
            </div>
          </div>

          {/* Días Laborables */}
          <div className="card border border-white/10">
            <h2 className="text-lg font-bold text-gray-200 flex items-center gap-2 mb-4">
              <Bell className="w-5 h-5 text-green-400" />
              Días Laborables
            </h2>
            <p className="text-sm text-gray-400 mb-4">
              Las alarmas solo sonarán en los días seleccionados
            </p>
            <div className="grid grid-cols-7 gap-2">
              {DAYS_LABELS.map((day, index) => (
                <button
                  key={day}
                  onClick={() => handleDayToggle(index)}
                  className={`py-3 px-2 rounded-xl text-xs font-bold transition-all ${
                    localConfig.workDays[index]
                      ? "bg-green-500 text-white border-2 border-green-400"
                      : "bg-gray-800 text-gray-500 border-2 border-gray-700 hover:bg-gray-700"
                  }`}
                >
                  {day.slice(0, 3)}
                </button>
              ))}
            </div>
          </div>

          {/* Botón Guardar */}
          <button
            onClick={handleSave}
            className="btn-primary w-full py-4 flex items-center justify-center gap-2 text-lg"
          >
            <Save className="w-5 h-5" />
            Guardar Configuración
          </button>
        </div>
      </main>
    </>
  );
}
