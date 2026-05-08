"use client";

import { useState, useRef } from "react";
import { X, Bug, Upload, Trash2, Send, CheckCircle, AlertTriangle, Image, Video, Loader2 } from "lucide-react";

interface Props {
  onClose: () => void;
}

const MAX_PHOTOS = 5;
const MAX_VIDEO = 1;
const MAX_FILE_SIZE_MB = 50;

interface MediaFile {
  file: File;
  preview: string;
  type: "image" | "video";
}

export default function BugReportModal({ onClose }: Props) {
  const [titulo, setTitulo]       = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [pagina, setPagina]       = useState("");
  const [media, setMedia]         = useState<MediaFile[]>([]);
  const [sending, setSending]     = useState(false);
  const [sent, setSent]           = useState(false);
  const [error, setError]         = useState<string | null>(null);
  const fileInputRef              = useRef<HTMLInputElement>(null);

  const photos = media.filter(m => m.type === "image");
  const videos = media.filter(m => m.type === "video");

  const handleFiles = (files: FileList | null) => {
    if (!files) return;
    const newMedia: MediaFile[] = [];
    const errs: string[] = [];

    Array.from(files).forEach(file => {
      const isImage = file.type.startsWith("image/");
      const isVideo = file.type.startsWith("video/");
      const sizeMB  = file.size / (1024 * 1024);

      if (!isImage && !isVideo) {
        errs.push(`${file.name}: solo fotos o videos.`);
        return;
      }
      if (sizeMB > MAX_FILE_SIZE_MB) {
        errs.push(`${file.name}: máximo ${MAX_FILE_SIZE_MB}MB.`);
        return;
      }
      if (isImage && photos.length + newMedia.filter(m => m.type === "image").length >= MAX_PHOTOS) {
        errs.push(`Máximo ${MAX_PHOTOS} fotos.`);
        return;
      }
      if (isVideo && videos.length + newMedia.filter(m => m.type === "video").length >= MAX_VIDEO) {
        errs.push(`Máximo 1 video.`);
        return;
      }

      newMedia.push({
        file,
        preview: URL.createObjectURL(file),
        type: isImage ? "image" : "video",
      });
    });

    if (errs.length) setError(errs.join(" "));
    else setError(null);

    setMedia(prev => [...prev, ...newMedia]);
  };

  const removeMedia = (idx: number) => {
    setMedia(prev => {
      URL.revokeObjectURL(prev[idx].preview);
      return prev.filter((_, i) => i !== idx);
    });
  };

  const handleSubmit = async () => {
    if (!titulo.trim() || !descripcion.trim()) {
      setError("Completá el título y la descripción.");
      return;
    }
    setSending(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("titulo", titulo.trim());
      formData.append("descripcion", descripcion.trim());
      formData.append("pagina", pagina.trim());
      formData.append("userAgent", navigator.userAgent);
      media.forEach((m, i) => formData.append(`archivo_${i}`, m.file));

      const res = await fetch("/api/bug-report", { method: "POST", body: formData });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Error al enviar el reporte");
      }
      setSent(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setSending(false);
    }
  };

  if (sent) {
    return (
      <div className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
        <div className="bg-[#1a1a1a] border border-white/10 rounded-2xl p-8 max-w-sm w-full text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-green-500/20 border border-green-500/40 flex items-center justify-center mx-auto">
            <CheckCircle className="w-8 h-8 text-green-400" />
          </div>
          <h2 className="text-xl font-black text-white">¡Reporte enviado!</h2>
          <p className="text-gray-400 text-sm">
            Recibimos tu reporte. Lo vamos a revisar y solucionar lo antes posible. ¡Gracias!
          </p>
          <button onClick={onClose} className="btn-primary w-full rounded-xl">
            Cerrar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="w-full sm:max-w-lg bg-[#1a1a1a] border border-white/10 rounded-t-2xl sm:rounded-2xl overflow-hidden"
        style={{ maxHeight: "92vh", display: "flex", flexDirection: "column" }}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 flex-shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-red-500/20 border border-red-500/40 flex items-center justify-center">
              <Bug className="w-4 h-4 text-red-400" />
            </div>
            <div>
              <h2 className="text-base font-black text-white">Reportar Error / Bug</h2>
              <p className="text-xs text-gray-500">Tu reporte nos ayuda a mejorar</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-white/10 text-gray-400 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body — scrollable */}
        <div className="overflow-y-auto flex-1 px-5 py-4 space-y-4">

          {/* Título */}
          <div>
            <label className="label text-xs">Título del error <span className="text-red-400">*</span></label>
            <input
              className="input input-sm"
              placeholder="Ej: El presupuesto no muestra todas las máquinas"
              value={titulo}
              onChange={e => setTitulo(e.target.value)}
              maxLength={120}
            />
          </div>

          {/* Página */}
          <div>
            <label className="label text-xs">¿En qué sección ocurre?</label>
            <select className="input input-sm" value={pagina} onChange={e => setPagina(e.target.value)}>
              <option value="">— Seleccionar —</option>
              <option value="Taller">Taller</option>
              <option value="Ventas">Ventas</option>
              <option value="Inventario">Inventario / Pedidos</option>
              <option value="Estadísticas">Estadísticas</option>
              <option value="Agenda">Agenda</option>
              <option value="Tareas">Tareas</option>
              <option value="Presupuesto">Presupuesto (impresión)</option>
              <option value="Configuración">Configuración</option>
              <option value="Otro">Otro</option>
            </select>
          </div>

          {/* Descripción */}
          <div>
            <label className="label text-xs">Descripción detallada <span className="text-red-400">*</span></label>
            <textarea
              className="input resize-none text-sm"
              rows={4}
              placeholder="Describí paso a paso qué hiciste y qué salió mal..."
              value={descripcion}
              onChange={e => setDescripcion(e.target.value)}
              maxLength={1000}
            />
            <p className="text-xs text-gray-600 mt-1 text-right">{descripcion.length}/1000</p>
          </div>

          {/* Upload */}
          <div>
            <label className="label text-xs">
              Adjuntar evidencia
              <span className="text-gray-500 font-normal ml-1">(hasta 5 fotos ó 1 video · máx. {MAX_FILE_SIZE_MB}MB c/u)</span>
            </label>

            {/* Previews */}
            {media.length > 0 && (
              <div className="grid grid-cols-3 gap-2 mb-3">
                {media.map((m, i) => (
                  <div key={i} className="relative rounded-xl overflow-hidden border border-white/10 aspect-square bg-black">
                    {m.type === "image" ? (
                      <img src={m.preview} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center gap-1">
                        <Video className="w-8 h-8 text-blue-400" />
                        <span className="text-[10px] text-gray-400 px-1 text-center truncate w-full text-center">
                          {m.file.name}
                        </span>
                      </div>
                    )}
                    <button
                      onClick={() => removeMedia(i)}
                      className="absolute top-1 right-1 w-5 h-5 rounded-full bg-red-600 flex items-center justify-center hover:bg-red-500"
                    >
                      <Trash2 className="w-3 h-3 text-white" />
                    </button>
                    {m.type === "image" && (
                      <div className="absolute bottom-1 left-1">
                        <Image className="w-3 h-3 text-white/60" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Botón seleccionar */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*"
              multiple
              className="hidden"
              onChange={e => handleFiles(e.target.files)}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={photos.length >= MAX_PHOTOS && videos.length >= MAX_VIDEO}
              className="w-full border-2 border-dashed border-white/15 hover:border-white/30 rounded-xl py-4 flex flex-col items-center gap-2 text-gray-400 hover:text-gray-200 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Upload className="w-5 h-5" />
              <span className="text-xs font-semibold">
                {photos.length === 0 && videos.length === 0
                  ? "Tocá para agregar fotos o video"
                  : `${photos.length}/${MAX_PHOTOS} fotos · ${videos.length}/${MAX_VIDEO} video`}
              </span>
              <span className="text-[10px] text-gray-600">JPG, PNG, GIF, MP4, MOV, WebM</span>
            </button>
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-start gap-2 bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3">
              <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-300">{error}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-white/10 flex gap-3 flex-shrink-0">
          <button onClick={onClose} className="btn-secondary btn-sm flex-1 rounded-xl">
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={sending || !titulo.trim() || !descripcion.trim()}
            className="btn-primary btn-sm flex-1 rounded-xl disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {sending
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Enviando...</>
              : <><Send className="w-4 h-4" /> Enviar Reporte</>}
          </button>
        </div>
      </div>
    </div>
  );
}
