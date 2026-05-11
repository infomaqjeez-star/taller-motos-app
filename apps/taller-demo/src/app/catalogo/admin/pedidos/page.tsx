"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAdminAuth } from "@/components/admin/AdminAuthContext";
import {
  Shield,
  ArrowLeft,
  Package,
  Clock,
  DollarSign,
  User,
  Check,
  X,
  Truck,
  Phone,
  MapPin,
  CreditCard,
  FileText,
  Calendar,
  Timer,
  Award,
} from "lucide-react";

interface Pedido {
  id: string;
  vendedor_id: string | null;
  items: Array<{ sku: string; nombre: string; precio: number; cantidad: number }>;
  datos_cliente: {
    nombre?: string;
    dni?: string;
    direccion?: string;
    entreCalles?: string;
    localidad?: string;
    provincia?: string;
    codigoPostal?: string;
    telefono?: string;
    formaPago?: string;
    notas?: string;
    comprobante?: string;
    numeroCliente?: string | null;
  };
  subtotal: number;
  descuento_pct: number;
  descuento_monto: number;
  envio: number;
  total: number;
  estado: string;
  comision_monto: number;
  comision_estado: string | null;
  whatsapp_enviado: boolean;
  created_at: string;
  vendedor?: {
    id: string;
    nombre: string;
    codigo_referido: string;
    comision_pct: number;
    nivel_vendedor?: string;
  } | null;
  fecha_pago_comision?: string | null;
  fecha_limite_pago?: string | null;
  fecha_liquidacion?: string | null;
  dias_restantes?: number;
}

function fmtMoney(n: number) {
  return "$" + (n || 0).toLocaleString("es-AR", { maximumFractionDigits: 0 });
}

export default function AdminPedidosPage() {
  const router = useRouter();
  const { admin, logout } = useAdminAuth();
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Pedido | null>(null);
  const [filtro, setFiltro] = useState("todas");

  useEffect(() => {
    if (!admin) {
      router.push("/catalogo/admin/login");
      return;
    }
    cargarPedidos();
  }, [admin, router]);

  const cargarPedidos = async () => {
    try {
      const res = await fetch("/api/admin/pedidos");
      const data = await res.json();
      setPedidos(data.pedidos || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const actualizarEstado = async (id: string, estado: string) => {
    try {
      await fetch("/api/admin/pedidos", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, estado }),
      });
      cargarPedidos();
    } catch (e) {
      console.error(e);
    }
  };

  const liquidarComision = async (pedidoId: string) => {
    if (!confirm("¿Confirmás que querés liquidar esta comisión?")) return;
    try {
      await fetch("/api/admin/liquidaciones", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pedido_id: pedidoId }),
      });
      cargarPedidos();
      if (selected) {
        setSelected({ ...selected, comision_estado: "pagada", fecha_liquidacion: new Date().toISOString() });
      }
    } catch (e) {
      console.error(e);
      alert("Error al liquidar comisión");
    }
  };

  const calcularDiasRestantes = (fechaLimite?: string | null): number => {
    if (!fechaLimite) return 0;
    const diff = new Date(fechaLimite).getTime() - new Date().getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  const getColorNivel = (nivel?: string): string => {
    const colors: Record<string, string> = {
      nuevo: "text-gray-400 border-gray-500/30 bg-gray-500/10",
      junior: "text-blue-400 border-blue-500/30 bg-blue-500/10",
      senior: "text-purple-400 border-purple-500/30 bg-purple-500/10",
      senior_pro: "text-orange-400 border-orange-500/30 bg-orange-500/10",
      master: "text-[#FF5722] border-[#FF5722]/30 bg-[#FF5722]/10",
    };
    return colors[nivel || "nuevo"] || colors.nuevo;
  };

  const getDiasMaximosNivel = (nivel?: string): number => {
    const dias: Record<string, number> = {
      nuevo: 30,
      junior: 30,
      senior: 20,
      senior_pro: 15,
      master: 7,
    };
    return dias[nivel || "nuevo"] || 30;
  };

  const pedidosFiltrados = pedidos.filter((p) => {
    if (filtro === "todas") return true;
    return p.estado === filtro;
  });

  const estados = ["todas", "pendiente", "confirmado", "pagado", "enviado", "entregado", "cancelado"];

  if (!admin) return null;

  return (
    <main className="mx-auto max-w-6xl px-4 py-6 pb-20">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <button
            onClick={() => router.push("/catalogo")}
            className="mb-4 flex items-center gap-1 text-sm text-gray-400 hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver al catálogo
          </button>
          <div className="flex items-center gap-2">
            <Shield className="h-7 w-7 text-[#FF5722]" />
            <h1 className="text-2xl font-black text-white">Panel de Pedidos</h1>
          </div>
          <p className="mt-1 text-sm text-gray-400">
            Admin: {admin.nombre} ({admin.email})
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => router.push("/catalogo/admin/seguridad")}
            className="rounded-lg border border-white/10 px-3 py-1.5 text-sm text-gray-400 hover:bg-white/5 hover:text-white flex items-center gap-1.5"
          >
            <Shield className="h-3.5 w-3.5 text-orange-400" /> Seguridad
          </button>
          <button
            onClick={logout}
            className="rounded-lg border border-white/10 px-3 py-1.5 text-sm text-gray-400 hover:bg-white/5 hover:text-white"
          >
            Cerrar sesión
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="mt-6 grid gap-3 sm:grid-cols-4">
        <StatCard label="Total pedidos" value={String(pedidos.length)} />
        <StatCard label="Pendientes" value={String(pedidos.filter((p) => p.estado === "pendiente").length)} color="yellow" />
        <StatCard label="Ventas totales" value={fmtMoney(pedidos.reduce((s, p) => s + (p.estado !== "cancelado" ? p.total : 0), 0))} color="green" />
        <StatCard label="Comisiones pendientes" value={fmtMoney(pedidos.reduce((s, p) => s + (p.comision_estado === "pendiente" ? p.comision_monto : 0), 0))} color="orange" />
      </div>

      {/* Filtros */}
      <div className="mt-6 flex flex-wrap gap-2">
        {estados.map((e) => (
          <button
            key={e}
            onClick={() => setFiltro(e)}
            className={`rounded-lg border px-3 py-1.5 text-xs font-medium capitalize ${
              filtro === e
                ? "border-[#FF5722] bg-[#FF5722]/20 text-[#FF5722]"
                : "border-white/10 text-gray-400 hover:border-white/20"
            }`}
          >
            {e} ({e === "todas" ? pedidos.length : pedidos.filter((p) => p.estado === e).length})
          </button>
        ))}
      </div>

      {/* Lista de pedidos */}
      {loading ? (
        <div className="mt-8 text-center text-gray-400">Cargando pedidos…</div>
      ) : pedidosFiltrados.length === 0 ? (
        <div className="mt-8 rounded-xl border border-white/10 bg-white/[0.03] p-8 text-center">
          <Package className="mx-auto h-10 w-10 text-gray-600" />
          <p className="mt-3 text-gray-400">No hay pedidos en esta categoría.</p>
        </div>
      ) : (
        <div className="mt-6 space-y-3">
          {pedidosFiltrados.map((p) => (
            <div
              key={p.id}
              onClick={() => setSelected(p)}
              className="cursor-pointer rounded-xl border border-white/10 bg-white/[0.03] p-4 hover:border-white/20"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-blue-400">#{p.id.slice(0, 8)}</span>
                    <EstadoBadge estado={p.estado} />
                    {p.vendedor && (
                      <>
                        <span className={`rounded-full border px-2 py-0.5 text-[10px] capitalize ${getColorNivel(p.vendedor.nivel_vendedor)}`}>
                          <Award className="inline h-3 w-3 mr-0.5" />
                          {p.vendedor.nivel_vendedor?.replace('_', ' ') || 'nuevo'}
                        </span>
                        <span className="rounded-full border border-purple-500/30 bg-purple-500/10 px-2 py-0.5 text-[10px] text-purple-400">
                          {p.vendedor.nombre}
                        </span>
                      </>
                    )}
                  </div>
                  <p className="mt-1 text-sm font-semibold text-white">
                    {p.datos_cliente?.nombre || "Sin nombre"}
                  </p>
                  <p className="text-xs text-gray-500">
                    {new Date(p.created_at).toLocaleString("es-AR")} · {p.items.length} productos
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-black text-white">{fmtMoney(p.total)}</p>
                  {p.comision_monto > 0 && p.comision_estado === 'pendiente' && p.fecha_limite_pago && (
                    <p className={`text-xs ${calcularDiasRestantes(p.fecha_limite_pago) <= 3 ? 'text-red-400' : 'text-yellow-400'}`}>
                      <Timer className="inline h-3 w-3 mr-0.5" />
                      Comisión: {fmtMoney(p.comision_monto)} · {calcularDiasRestantes(p.fecha_limite_pago)} días restantes
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal de detalle */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/70 p-4 pt-10">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-white/10 bg-[#1a1a1a] p-6">
            <div className="flex items-start justify-between">
              <h2 className="text-xl font-black text-white">
                Pedido #{selected.id.slice(0, 8)}
              </h2>
              <button
                onClick={() => setSelected(null)}
                className="rounded-lg p-1 text-gray-400 hover:bg-white/10 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Estado y acciones */}
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <EstadoBadge estado={selected.estado} />
              <span className="text-xs text-gray-500">
                {new Date(selected.created_at).toLocaleString("es-AR")}
              </span>
            </div>

            {/* Cambiar estado */}
            <div className="mt-4 flex flex-wrap gap-2">
              {["pendiente", "confirmado", "pagado", "enviado", "entregado", "cancelado"].map((e) => (
                <button
                  key={e}
                  onClick={() => {
                    actualizarEstado(selected.id, e);
                    setSelected({ ...selected, estado: e });
                  }}
                  disabled={selected.estado === e}
                  className={`rounded-lg border px-3 py-1 text-xs font-medium capitalize ${
                    selected.estado === e
                      ? "border-[#39FF14] bg-[#39FF14]/20 text-[#39FF14]"
                      : "border-white/10 text-gray-400 hover:border-white/20"
                  }`}
                >
                  {e}
                </button>
              ))}
            </div>

            {/* Cliente */}
            <section className="mt-6 space-y-2">
              <h3 className="flex items-center gap-2 text-sm font-bold text-gray-300">
                <User className="h-4 w-4 text-[#FDB71A]" />
                Datos del cliente
              </h3>
              <div className="rounded-lg bg-white/5 p-3 text-sm space-y-1">
                <p><span className="text-gray-500">Nombre:</span> {selected.datos_cliente?.nombre || "-"}</p>
                <p><span className="text-gray-500">DNI:</span> {selected.datos_cliente?.dni || "-"}</p>
                <p><span className="text-gray-500">Teléfono:</span> {selected.datos_cliente?.telefono || "-"}</p>
                {selected.datos_cliente?.numeroCliente && (
                  <p><span className="text-gray-500">N° Cliente:</span> <span className="text-[#39FF14]">{selected.datos_cliente.numeroCliente}</span></p>
                )}
              </div>
            </section>

            {/* Dirección */}
            <section className="mt-4 space-y-2">
              <h3 className="flex items-center gap-2 text-sm font-bold text-gray-300">
                <MapPin className="h-4 w-4 text-[#FDB71A]" />
                Dirección de entrega
              </h3>
              <div className="rounded-lg bg-white/5 p-3 text-sm space-y-1">
                <p>{selected.datos_cliente?.direccion || "-"}</p>
                <p className="text-gray-500">Entre: {selected.datos_cliente?.entreCalles || "-"}</p>
                <p>{selected.datos_cliente?.localidad}, {selected.datos_cliente?.provincia} ({selected.datos_cliente?.codigoPostal})</p>
              </div>
            </section>

            {/* Productos */}
            <section className="mt-4 space-y-2">
              <h3 className="flex items-center gap-2 text-sm font-bold text-gray-300">
                <Package className="h-4 w-4 text-[#FDB71A]" />
                Productos ({selected.items.length})
              </h3>
              <div className="rounded-lg bg-white/5 p-3 space-y-2">
                {selected.items.map((item, i) => (
                  <div key={i} className="flex justify-between text-sm">
                    <span className="text-gray-300">
                      {item.cantidad}x {item.nombre} <span className="font-mono text-blue-400">({item.sku})</span>
                    </span>
                    <span className="text-gray-300">{fmtMoney(item.precio * item.cantidad)}</span>
                  </div>
                ))}
              </div>
            </section>

            {/* Totales */}
            <div className="mt-4 rounded-lg border border-white/10 p-3 space-y-1 text-sm">
              <div className="flex justify-between text-gray-400">
                <span>Subtotal</span>
                <span>{fmtMoney(selected.subtotal)}</span>
              </div>
              {selected.descuento_monto > 0 && (
                <div className="flex justify-between text-[#39FF14]">
                  <span>Descuento ({selected.descuento_pct}%)</span>
                  <span>-{fmtMoney(selected.descuento_monto)}</span>
                </div>
              )}
              <div className="flex justify-between text-gray-400">
                <span>Envío</span>
                <span>{selected.envio === 0 ? "Gratis" : fmtMoney(selected.envio)}</span>
              </div>
              <div className="flex justify-between border-t border-white/10 pt-1 text-lg font-black text-white">
                <span>Total</span>
                <span className="text-[#FF5722]">{fmtMoney(selected.total)}</span>
              </div>
            </div>

            {/* Pago */}
            <section className="mt-4 space-y-2">
              <h3 className="flex items-center gap-2 text-sm font-bold text-gray-300">
                <CreditCard className="h-4 w-4 text-[#FDB71A]" />
                Pago
              </h3>
              <div className="rounded-lg bg-white/5 p-3 text-sm space-y-1">
                <p><span className="text-gray-500">Forma:</span> {selected.datos_cliente?.formaPago || "-"}</p>
                {selected.datos_cliente?.comprobante && (
                  <p><span className="text-gray-500">Comprobante:</span> <span className="text-[#39FF14]">{selected.datos_cliente.comprobante}</span></p>
                )}
              </div>
            </section>

            {/* Vendedor */}
            {selected.vendedor && (
              <section className="mt-4 space-y-2">
                <h3 className="flex items-center gap-2 text-sm font-bold text-purple-400">
                  <DollarSign className="h-4 w-4" />
                  Vendedor referido
                </h3>
                <div className="rounded-lg border border-purple-500/20 bg-purple-500/5 p-3 text-sm space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-gray-500">Nombre:</span>
                    <span className="text-white">{selected.vendedor.nombre}</span>
                    <span className={`rounded-full border px-2 py-0.5 text-[10px] capitalize ${getColorNivel(selected.vendedor.nivel_vendedor)}`}>
                      <Award className="inline h-3 w-3 mr-0.5" />
                      {selected.vendedor.nivel_vendedor?.replace('_', ' ') || 'nuevo'}
                    </span>
                  </div>
                  <p><span className="text-gray-500">Código:</span> {selected.vendedor.codigo_referido}</p>
                  <p><span className="text-gray-500">Comisión:</span> <span className="font-bold text-white">{fmtMoney(selected.comision_monto)}</span></p>
                  
                  {/* Fechas de pago */}
                  {selected.comision_estado === 'pendiente' && (
                    <div className="mt-2 rounded-lg bg-white/5 p-2 space-y-1">
                      <p className="flex items-center gap-1 text-xs text-gray-400">
                        <Calendar className="h-3 w-3" />
                        Máximo {getDiasMaximosNivel(selected.vendedor.nivel_vendedor)} días según nivel
                      </p>
                      {selected.fecha_limite_pago && (
                        <p className={`flex items-center gap-1 text-xs ${calcularDiasRestantes(selected.fecha_limite_pago) <= 3 ? 'text-red-400' : 'text-yellow-400'}`}>
                          <Timer className="h-3 w-3" />
                          Vence: {new Date(selected.fecha_limite_pago).toLocaleDateString('es-AR')} 
                          ({calcularDiasRestantes(selected.fecha_limite_pago)} días restantes)
                        </p>
                      )}
                      <button
                        onClick={() => liquidarComision(selected.id)}
                        className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg bg-[#39FF14] py-2 text-xs font-bold text-black hover:bg-[#32E612]"
                      >
                        <Check className="h-3 w-3" />
                        Liquidar comisión ahora
                      </button>
                    </div>
                  )}
                  
                  {selected.comision_estado === 'pagada' && (
                    <div className="mt-2 rounded-lg border border-[#39FF14]/20 bg-[#39FF14]/5 p-2">
                      <p className="flex items-center gap-1 text-xs text-[#39FF14]">
                        <Check className="h-3 w-3" />
                        Comisión pagada
                        {selected.fecha_liquidacion && ` - ${new Date(selected.fecha_liquidacion).toLocaleDateString('es-AR')}`}
                      </p>
                    </div>
                  )}
                </div>
              </section>
            )}

            {/* Notas */}
            {selected.datos_cliente?.notas && (
              <section className="mt-4 space-y-2">
                <h3 className="flex items-center gap-2 text-sm font-bold text-gray-300">
                  <FileText className="h-4 w-4 text-[#FDB71A]" />
                  Notas
                </h3>
                <div className="rounded-lg bg-white/5 p-3 text-sm text-gray-300">
                  {selected.datos_cliente.notas}
                </div>
              </section>
            )}
          </div>
        </div>
      )}
    </main>
  );
}

function StatCard({ label, value, color = "white" }: { label: string; value: string; color?: string }) {
  const colorMap: Record<string, string> = {
    white: "border-white/10 bg-white/[0.03] text-white",
    yellow: "border-yellow-500/30 bg-yellow-500/5 text-yellow-400",
    green: "border-[#39FF14]/30 bg-[#39FF14]/5 text-[#39FF14]",
    orange: "border-[#FF5722]/30 bg-[#FF5722]/5 text-[#FF5722]",
  };
  return (
    <div className={`rounded-xl border p-3 ${colorMap[color] || colorMap.white}`}>
      <p className="text-xs text-gray-400">{label}</p>
      <p className="mt-1 text-lg font-black">{value}</p>
    </div>
  );
}

function EstadoBadge({ estado }: { estado: string }) {
  const colors: Record<string, string> = {
    pendiente: "border-yellow-500/30 bg-yellow-500/10 text-yellow-400",
    confirmado: "border-blue-500/30 bg-blue-500/10 text-blue-400",
    pagado: "border-[#39FF14]/30 bg-[#39FF14]/5 text-[#39FF14]",
    enviado: "border-purple-500/30 bg-purple-500/10 text-purple-400",
    entregado: "border-[#39FF14]/30 bg-[#39FF14]/10 text-[#39FF14]",
    cancelado: "border-red-500/30 bg-red-500/10 text-red-400",
  };
  return (
    <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold capitalize ${colors[estado] || colors.pendiente}`}>
      {estado}
    </span>
  );
}
