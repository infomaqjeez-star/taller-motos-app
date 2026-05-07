"use client";

import { useState } from "react";
import { Clock, Bell, Save, Volume2, Play, X, Plus, Trash2 } from "lucide-react";
import Navbar from "@/components/Navbar";
import { useAlarms, AlarmConfig, SingleAlarm } from "@/hooks/useAlarms";
import { generateId } from "@/lib/utils";

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

  const handleFlexAlarmChange = (index: number, field: keyof SingleAlarm, value: any) => {
    setLocalConfig(prev => ({
      ...prev,
      flexAlarms: prev.flexAlarms.map((a, i) =>
        i === index ? { ...a, [field]: value } : a
      ),
    }));
  };

  const handleCorreoAlarmChange = (index: number, field: keyof SingleAlarm, value: any) => {
    setLocalConfig(prev => ({
      ...prev,
      correoAlarms: prev.correoAlarms.map((a, i) =>
        i === index ? { ...a, [field]: value } : a
      ),
    }));
  };

  const handleAddFlexAlarm = () => {
    setLocalConfig(prev => ({
      ...prev,
      flexAlarms: [...prev.flexAlarms, {
        hour: 12,
        minute: 0,
        enabled: true,
        message: "chequear flex",
        id: generateId(),
      }],
    }));
  };

  const handleRemoveFlexAlarm = (index: number) => {
    setLocalConfig(prev => ({
      ...prev,
      flexAlarms: prev.flexAlarms.filter((_, i) => i !== index),
    }));
  };

  const handleAddCorreoAlarm = () => {
    setLocalConfig(prev => ({
      ...prev,
      correoAlarms: [...prev.correoAlarms, {
        hour: 17,
        minute: 0,
        enabled: true,
        message: "entregar correo",
        id: generateId(),
      }],
    }));
  };

  const handleRemoveCorreoAlarm = (index: number) => {
    setLocalConfig(prev => ({
      ...prev,
      correoAlarms: prev.correoAlarms.filter((_, i) => i !== index),
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
          {/* Alarmas de Flex */}
          <div className="card border border-white/10">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-200 flex items-center gap-2">
                <Clock className="w-5 h-5 text-orange-400" />
                Alarmas de Flex
              </h2>
              <button
                onClick={handleAddFlexAlarm}
                className="flex items-center gap-2 py-2 px-4 rounded-lg bg-orange-600 hover:bg-orange-700 text-white text-sm font-bold transition-colors"
              >
                <Plus className="w-4 h-4" /> Agregar
              </button>
            </div>

            <div className="space-y-4">
              {localConfig.flexAlarms.map((alarm, index) => (
                <div key={alarm.id} className="p-4 bg-orange-500/10 border border-orange-500/30 rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={alarm.enabled}
                        onChange={(e) => handleFlexAlarmChange(index, "enabled", e.target.checked)}
                        className="w-5 h-5 rounded"
                      />
                      <span className="text-sm font-semibold text-gray-300">Activar</span>
                    </label>
                    <button
                      onClick={() => handleRemoveFlexAlarm(index)}
                      className="p-2 rounded-lg text-red-400 hover:bg-red-500/15 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="label">Hora</label>
                      <input
                        type="number"
                        min="0"
                        max="23"
                        className="input"
                        value={alarm.hour}
                        onChange={(e) => handleFlexAlarmChange(index, "hour", parseInt(e.target.value) || 0)}
                      />
                    </div>
                    <div>
                      <label className="label">Minuto</label>
                      <input
                        type="number"
                        min="0"
                        max="59"
                        className="input"
                        value={alarm.minute}
                        onChange={(e) => handleFlexAlarmChange(index, "minute", parseInt(e.target.value) || 0)}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="label">Mensaje de voz</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        className="input flex-1"
                        value={alarm.message}
                        onChange={(e) => handleFlexAlarmChange(index, "message", e.target.value)}
                      />
                      <button
                        onClick={() => handleTestVoice(alarm.message)}
                        disabled={playing === alarm.message}
                        className="btn-secondary px-4 flex items-center gap-2"
                      >
                        <Play className="w-4 h-4" />
                        {playing === alarm.message ? "Reproduciendo..." : "Probar"}
                      </button>
                    </div>
                  </div>

                  <p className="text-sm text-orange-300">
                    ⏰ Horario: <span className="font-bold">
                      {String(alarm.hour).padStart(2, "0")}:
                      {String(alarm.minute).padStart(2, "0")}
                    </span> hs
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Alarmas de Correo */}
          <div className="card border border-white/10">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-200 flex items-center gap-2">
                <Clock className="w-5 h-5 text-blue-400" />
                Alarmas de Correo
              </h2>
              <button
                onClick={handleAddCorreoAlarm}
                className="flex items-center gap-2 py-2 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold transition-colors"
              >
                <Plus className="w-4 h-4" /> Agregar
              </button>
            </div>

            <div className="space-y-4">
              {localConfig.correoAlarms.map((alarm, index) => (
                <div key={alarm.id} className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={alarm.enabled}
                        onChange={(e) => handleCorreoAlarmChange(index, "enabled", e.target.checked)}
                        className="w-5 h-5 rounded"
                      />
                      <span className="text-sm font-semibold text-gray-300">Activar</span>
                    </label>
                    <button
                      onClick={() => handleRemoveCorreoAlarm(index)}
                      className="p-2 rounded-lg text-red-400 hover:bg-red-500/15 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="label">Hora</label>
                      <input
                        type="number"
                        min="0"
                        max="23"
                        className="input"
                        value={alarm.hour}
                        onChange={(e) => handleCorreoAlarmChange(index, "hour", parseInt(e.target.value) || 0)}
                      />
                    </div>
                    <div>
                      <label className="label">Minuto</label>
                      <input
                        type="number"
                        min="0"
                        max="59"
                        className="input"
                        value={alarm.minute}
                        onChange={(e) => handleCorreoAlarmChange(index, "minute", parseInt(e.target.value) || 0)}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="label">Mensaje de voz</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        className="input flex-1"
                        value={alarm.message}
                        onChange={(e) => handleCorreoAlarmChange(index, "message", e.target.value)}
                      />
                      <button
                        onClick={() => handleTestVoice(alarm.message)}
                        disabled={playing === alarm.message}
                        className="btn-secondary px-4 flex items-center gap-2"
                      >
                        <Play className="w-4 h-4" />
                        {playing === alarm.message ? "Reproduciendo..." : "Probar"}
                      </button>
                    </div>
                  </div>

                  <p className="text-sm text-blue-300">
                    ⏰ Horario: <span className="font-bold">
                      {String(alarm.hour).padStart(2, "0")}:
                      {String(alarm.minute).padStart(2, "0")}
                    </span> hs
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Alarma de Daniela */}
          <div className="card border border-white/10">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-200 flex items-center gap-2">
                <Clock className="w-5 h-5 text-purple-400" />
                Alarma de Daniela
              </h2>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={localConfig.danielaAlarm.enabled}
                  onChange={(e) => setLocalConfig(prev => ({
                    ...prev,
                    danielaAlarm: { ...prev.danielaAlarm, enabled: e.target.checked },
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
                  value={localConfig.danielaAlarm.hour}
                  onChange={(e) => setLocalConfig(prev => ({
                    ...prev,
                    danielaAlarm: { ...prev.danielaAlarm, hour: parseInt(e.target.value) || 0 },
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
                  value={localConfig.danielaAlarm.minute}
                  onChange={(e) => setLocalConfig(prev => ({
                    ...prev,
                    danielaAlarm: { ...prev.danielaAlarm, minute: parseInt(e.target.value) || 0 },
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
                  value={localConfig.danielaAlarm.message}
                  onChange={(e) => setLocalConfig(prev => ({
                    ...prev,
                    danielaAlarm: { ...prev.danielaAlarm, message: e.target.value },
                  }))}
                />
                <button
                  onClick={() => handleTestVoice(localConfig.danielaAlarm.message)}
                  disabled={playing === localConfig.danielaAlarm.message}
                  className="btn-secondary px-4 flex items-center gap-2"
                >
                  <Play className="w-4 h-4" />
                  {playing === localConfig.danielaAlarm.message ? "Reproduciendo..." : "Probar"}
                </button>
              </div>
            </div>

            <div className="p-3 bg-purple-500/10 border border-purple-500/30 rounded-xl">
              <p className="text-sm text-purple-300">
                ⏰ Horario actual: <span className="font-bold">
                  {String(localConfig.danielaAlarm.hour).padStart(2, "0")}:
                  {String(localConfig.danielaAlarm.minute).padStart(2, "0")}
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
