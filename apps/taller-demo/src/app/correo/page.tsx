"use client";

import { useState, useEffect, useRef } from "react";
import Navbar from "@/components/Navbar";
import BottomNav from "@/components/BottomNav";
import { correoDb } from "@/lib/db";
import { CorreoDespacho } from "@/lib/types";
import {
  Mail, Upload, Trash2, Calendar, Package, FileText,
  X, Plus, ChevronDown, ChevronUp,
} from "lucide-react";

const fmtFecha = (f: string) => {
  const d = new Date(f + "T00:00:00");
  return d.toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" });
};

export default function CorreoPage() {
  const [despachos, setDespachos] = useState<CorreoDespacho[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    fecha: new Date().toISOString().split("T")[0],
    archivo_url: "",
    archivo_tipo: null as "imagen" | "pdf" | null,
    notas: "",
    cantidad_envios: 0,
  });

  const load = async () => {
    try {
      setLoading(true);
      const data = await correoDb.getAll();
      setDespachos(data);
    } catch (e) {
      console.error("Error cargando despachos:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const resetForm = () => {
    setForm({
      fecha: new Date().toISOString().split("T")[0],
      archivo_url: "",
      archivo_tipo: null,
      notas: "",
      cantidad_envios: 0,
    });
    setEditingId(null);
    setShowForm(false);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      if (!res.ok) { const err = await res.json(); throw new Error(err.error || "Error al subir archivo"); }
      const { url } = await res.json();
      const tipo = file.type.startsWith("image/") ? "imagen" : "pdf";
      setForm((prev) => ({ ...prev, archivo_url: url, archivo_tipo: tipo }));
    } catch (err: any) {
      alert("Error al subir archivo: " + err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingId) { await correoDb.update(editingId, form); }
      else { await correoDb.create(form); }
      resetForm();
      await load();
    } catch (err: any) { alert("Error: " + err.message); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Eliminar este despacho?")) return;
    try { await correoDb.delete(id); await load(); }
    catch (err: any) { alert("Error: " + err.message); }
  };

  const handleEdit = (d: CorreoDespacho) => {
    setForm({
      fecha: d.fecha,
      archivo_url: d.archivo_url || "",
      archivo_tipo: d.archivo_tipo || null,
      notas: d.notas || "",
      cantidad_envios: d.cantidad_envios || 0,
    });
    setEditingId(d.id);
    setShowForm(true);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200">
      <Navbar />
      <main className="mx-auto max-w-4xl px-4 py-6 pb-24 sm:pb-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-blue-600/20 p-2.5">
              <Mail className="h-6 w-6 text-blue-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Correo Argentino</h1>
              <p className="text-sm text-slate-400">Despachos diarios</p>
            </div>
          </div>
          <button
            onClick={() => { resetForm(); setShowForm(true); }}
            className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-blue-500 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Nuevo despacho
          </button>
        </div>

        {showForm && (
          <div className="mb-6 rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-white">{editingId ? "Editar" : "Nuevo"} despacho</h2>
              <button onClick={resetForm} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white"><X className="h-5 w-5" /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-400">Fecha</label>
                  <input type="date" value={form.fecha} onChange={(e) => setForm((p) => ({ ...p, fecha: e.target.value }))} className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2.5 text-sm text-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-400">Envios</label>
                  <input type="number" min="0" value={form.cantidad_envios} onChange={(e) => setForm((p) => ({ ...p, cantidad_envios: Number(e.target.value) }))} className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2.5 text-sm text-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" />
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-400">Planilla (foto o PDF)</label>
                <div className="flex items-center gap-3">
                  <input ref={fileInputRef} type="file" accept="image/*,.pdf" onChange={handleFileUpload} className="hidden" />
                  <button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploading} className="flex items-center gap-2 rounded-xl border border-dashed border-slate-600 px-4 py-2.5 text-sm text-slate-300 hover:border-blue-500 hover:text-blue-400 transition-colors disabled:opacity-50">
                    <Upload className="h-4 w-4" /> {uploading ? "Subiendo..." : form.archivo_url ? "Cambiar archivo" : "Subir archivo"}
                  </button>
                  {form.archivo_url && <span className="text-sm text-emerald-400">Archivo cargado</span>}
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-400">Notas</label>
                <textarea value={form.notas} onChange={(e) => setForm((p) => ({ ...p, notas: e.target.value }))} rows={2} className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2.5 text-sm text-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none" placeholder="Observaciones..." />
              </div>
              <div className="flex gap-2 pt-2">
                <button type="submit" className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-blue-500 transition-colors">{editingId ? "Guardar" : "Crear"}</button>
                <button type="button" onClick={resetForm} className="rounded-xl border border-slate-700 px-5 py-2.5 text-sm text-slate-300 hover:bg-slate-800 transition-colors">Cancelar</button>
              </div>
            </form>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-20"><div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" /></div>
        ) : despachos.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-500"><Package className="mb-3 h-12 w-12" /><p className="text-sm">No hay despachos registrados</p></div>
        ) : (
          <div className="space-y-3">
            {despachos.map((d) => (
              <div key={d.id} className="rounded-2xl border border-slate-800 bg-slate-900 overflow-hidden">
                <div className="flex cursor-pointer items-center justify-between p-4 hover:bg-slate-800/50 transition-colors" onClick={() => setExpandedId(expandedId === d.id ? null : d.id)}>
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600/15"><Calendar className="h-5 w-5 text-blue-400" /></div>
                    <div>
                      <p className="font-bold text-white">{fmtFecha(d.fecha)}</p>
                      <p className="text-xs text-slate-400">{d.cantidad_envios} envio{d.cantidad_envios !== 1 ? "s" : ""}{d.archivo_url ? " - Con planilla" : ""}</p>
                    </div>
                  </div>
                  {expandedId === d.id ? <ChevronUp className="h-5 w-5 text-slate-400" /> : <ChevronDown className="h-5 w-5 text-slate-400" />}
                </div>
                {expandedId === d.id && (
                  <div className="border-t border-slate-800 px-4 py-4 space-y-3">
                    {d.archivo_url && (
                      <div>
                        <p className="mb-2 text-xs font-semibold text-slate-400">Planilla</p>
                        {d.archivo_tipo === "imagen" ? (
                          <a href={d.archivo_url} target="_blank" rel="noopener noreferrer"><img src={d.archivo_url} alt="Planilla" className="max-h-64 rounded-xl border border-slate-700 object-contain bg-slate-800" /></a>
                        ) : (
                          <a href={d.archivo_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm text-blue-400 hover:bg-slate-700 transition-colors"><FileText className="h-4 w-4" /> Ver PDF</a>
                        )}
                      </div>
                    )}
                    {d.notas && <div><p className="mb-1 text-xs font-semibold text-slate-400">Notas</p><p className="text-sm text-slate-300">{d.notas}</p></div>}
                    <div className="flex gap-2 pt-1">
                      <button onClick={(e) => { e.stopPropagation(); handleEdit(d); }} className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-800 transition-colors">Editar</button>
                      <button onClick={(e) => { e.stopPropagation(); handleDelete(d.id); }} className="rounded-lg border border-red-800 px-3 py-1.5 text-xs text-red-400 hover:bg-red-900/20 transition-colors"><Trash2 className="h-3.5 w-3.5 inline mr-1" />Eliminar</button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
      <BottomNav />
    </div>
  );
}
