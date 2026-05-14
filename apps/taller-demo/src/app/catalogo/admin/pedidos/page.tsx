"use client";

import { useEffect, useState, Suspense, type ReactNode } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAdminAuth } from "@/components/admin/AdminAuthContext";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  Filler,
  Tooltip,
  Legend,
} from "chart.js";
import { Line, Doughnut } from "react-chartjs-2";
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, ArcElement, Filler, Tooltip, Legend);
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
  Users,
  ShoppingCart,
  TrendingUp,
  Download,
  BarChart3,
  Store,
  Percent,
  RefreshCcw,
  Wallet,
  Star,
  AlertTriangle,
  Megaphone,
  Search,
  Tag,
  CheckCircle,
  XCircle,
  Loader2,
  ImageOff,
  Zap,
  Slash,
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
  gerente_id?: string | null;
  comision_gerente_monto?: number;
  whatsapp_enviado: boolean;
  created_at: string;
  vendedor?: {
    id: string;
    nombre: string;
    codigo_referido: string;
    comision_pct: number;
    nivel_vendedor?: string;
    lider_id?: string | null;
    es_gerente?: boolean;
  } | null;
  fecha_pago_comision?: string | null;
  fecha_limite_pago?: string | null;
  fecha_liquidacion?: string | null;
  dias_restantes?: number;
  updated_at?: string | null;
  fecha_confirmado?: string | null;
  fecha_pagado?: string | null;
  fecha_enviado?: string | null;
  fecha_entregado?: string | null;
  fecha_cancelado?: string | null;
}

function fmtMoney(n: number) {
  return "$" + (n || 0).toLocaleString("es-AR", { maximumFractionDigits: 0 });
}

function fmtFechaHora(iso?: string | null) {
  if (!iso) return null;
  const d = new Date(iso);
  return d.toLocaleString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

interface DashboardStats {
  totalVendedores: number;
  totalClientes: number;
  totalProductos: number;
  totalPedidos: number;
  ventasTotales: number;
  ventasMes: number;
  ventasSemana: number;
  comisionesPendientes: number;
  comisionesPagadas: number;
  totalCarritosAbandonados: number;
  totalItemsCarrito: number;
}

interface EvolucionData {
  labels: string[];
  ventas: number[];
  comisiones: number[];
}

interface VendedorData {
  id: string;
  nombre: string;
  email: string;
  codigo_referido: string;
  nivel_vendedor: string;
  total_vendido: number;
  comision_pct: number;
  estado: string;
  created_at: string;
  lider_id?: string | null;
  es_gerente?: boolean;
}

interface ClienteData {
  id: string;
  nombre: string;
  email: string;
  telefono: string;
  dni: string;
  created_at: string;
}

type Vista = "pedidos" | "vendedores" | "gerentes" | "clientes" | "dashboard" | "precios" | "finanzas";
const VISTAS_VALIDAS: Vista[] = ["dashboard", "pedidos", "vendedores", "gerentes", "clientes", "precios", "finanzas"];

export default function AdminPedidosPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "#080c16" }}><div className="h-8 w-8 animate-spin rounded-full border-2 border-orange-500 border-t-transparent" /></div>}>
      <AdminPedidosContent />
    </Suspense>
  );
}

function AdminPedidosContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { admin, logout, loading: authLoading, getToken } = useAdminAuth();
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Pedido | null>(null);
  const [filtro, setFiltro] = useState("todas");
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [vendedores, setVendedores] = useState<VendedorData[]>([]);
  const [clientes, setClientes] = useState<ClienteData[]>([]);
  const tabFromUrl = searchParams.get("tab") as Vista | null;
  const [vistaActiva, setVistaActiva] = useState<Vista>(
    tabFromUrl && VISTAS_VALIDAS.includes(tabFromUrl) ? tabFromUrl : "dashboard"
  );
  const [precioStats, setPrecioStats] = useState<{ total: number; activos: number; precioMin: number; precioMax: number; precioPromedio: number } | null>(null);
  const [porcentajeAjuste, setPorcentajeAjuste] = useState("");
  const [ajustandoPrecios, setAjustandoPrecios] = useState(false);
  const [mensajeAjuste, setMensajeAjuste] = useState("");
  // Estados para edición por SKU
  const [skuBuscar, setSkuBuscar] = useState("");
  const [productoEdit, setProductoEdit] = useState<any | null>(null);
  const [loadingProducto, setLoadingProducto] = useState(false);
  const [guardandoProducto, setGuardandoProducto] = useState(false);
  const [mensajeProducto, setMensajeProducto] = useState("");
  const [precioNormalEdit, setPrecioNormalEdit] = useState("");
  const [enOfertaEdit, setEnOfertaEdit] = useState(false);
  const [pctDescuentoEdit, setPctDescuentoEdit] = useState("");
  const [precioOfertaEdit, setPrecioOfertaEdit] = useState("");
  const [evolucion, setEvolucion] = useState<EvolucionData | null>(null);
  const [pedidosPorEstado, setPedidosPorEstado] = useState<Record<string, number>>({});
  const [loadingDashboard, setLoadingDashboard] = useState(true);
  const [dashboardError, setDashboardError] = useState<string | null>(null);
  const [guardandoGerente, setGuardandoGerente] = useState<string | null>(null);
  const [asignandoGerenteId, setAsignandoGerenteId] = useState<Record<string, string>>({});
  const [notificaciones, setNotificaciones] = useState<any[]>([]);
  const [notifOpen, setNotifOpen] = useState(false);
  const [busquedaCliente, setBusquedaCliente] = useState("");

  useEffect(() => {
    if (authLoading) return;
    if (!admin) {
      router.push("/catalogo/admin/login");
      return;
    }
    cargarPedidos();
    cargarDashboard();
    cargarVendedores();
    cargarNotificaciones();
  }, [admin, authLoading, router]);

  const cargarNotificaciones = async () => {
    try {
      const token = localStorage.getItem("admin_catalogo_session");
      const parsed = token ? JSON.parse(token) : null;
      const res = await fetch("/api/notificaciones", {
        headers: parsed?.token ? { Authorization: `Bearer ${parsed.token}` } : {},
      });
      const data = await res.json();
      setNotificaciones(data.notificaciones || []);
    } catch (e) {
      console.error(e);
    }
  };

  const marcarNotifLeida = async (id: string) => {
    try {
      const token = localStorage.getItem("admin_catalogo_session");
      const parsed = token ? JSON.parse(token) : null;
      await fetch("/api/notificaciones", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(parsed?.token ? { Authorization: `Bearer ${parsed.token}` } : {}),
        },
        body: JSON.stringify({ id }),
      });
      setNotificaciones((prev) => prev.filter((n) => n.id !== id));
    } catch (e) {
      console.error(e);
    }
  };

  const marcarTodasLeidas = async () => {
    const ids = notificaciones.map((n) => n.id);
    for (const id of ids) await marcarNotifLeida(id);
  };

  const cargarVendedores = async () => {
    try {
      const token = localStorage.getItem("admin_catalogo_session");
      const parsed = token ? JSON.parse(token) : null;
      const res = await fetch("/api/admin/vendedores", {
        headers: parsed?.token ? { Authorization: `Bearer ${parsed.token}` } : {},
      });
      const data = await res.json();
      console.log("[vendedores] status:", res.status, "data:", data);
      if (Array.isArray(data.vendedores)) {
        console.log("[vendedores] count:", data.vendedores.length);
        setVendedores(data.vendedores);
      } else {
        console.warn("[vendedores] respuesta inesperada:", data);
      }
    } catch (e) {
      console.error("[vendedores] Error:", e);
    }
  };

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

  const cargarDashboard = async () => {
    setLoadingDashboard(true);
    setDashboardError(null);
    try {
      const res = await fetch("/api/admin/dashboard");
      const data = await res.json();
      if (!res.ok || data.error) {
        setDashboardError(data.error || "Error al cargar dashboard");
        return;
      }
      if (data.resumen) {
        setStats(data.resumen);
        // vendedores se carga por cargarVendedores() separado — no pisar aquí
        if (data.clientes?.length) setClientes(data.clientes);
        else if (data.clientesRecientes?.length) setClientes(data.clientesRecientes);
        setEvolucion(data.evolucion || null);
        setPedidosPorEstado(data.pedidosPorEstado || {});
      }
    } catch (e: any) {
      setDashboardError(e.message || "Error de red");
      console.error("Error cargando dashboard:", e);
    } finally {
      setLoadingDashboard(false);
    }
  };

  const exportarCSV = (nombre: string, filas: string[][]) => {
    const csv = filas.map(f => f.map(c => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = nombre + "_" + new Date().toISOString().slice(0, 10) + ".csv";
    link.click();
  };

  const exportarVendedores = () => {
    const filas = [
      ["Nombre", "Email", "Codigo Referido", "Nivel", "Total Vendido", "Comision %", "Estado", "Fecha Registro"],
      ...vendedores.map(v => [
        v.nombre, v.email, v.codigo_referido, v.nivel_vendedor || "nuevo",
        fmtMoney(v.total_vendido), String(v.comision_pct) + "%", v.estado || "activo",
        new Date(v.created_at).toLocaleDateString("es-AR")
      ])
    ];
    exportarCSV("vendedores", filas);
  };

  const exportarClientes = () => {
    const filas = [
      ["Nombre", "Email", "Telefono", "DNI", "Fecha Registro"],
      ...clientes.map(c => [
        c.nombre || "-", c.email || "-", c.telefono || "-", c.dni || "-",
        new Date(c.created_at).toLocaleDateString("es-AR")
      ])
    ];
    exportarCSV("clientes", filas);
  };

  const cargarPrecios = async () => {
    try {
      const token = localStorage.getItem("admin_catalogo_session");
      const parsed = token ? JSON.parse(token) : null;
      const res = await fetch("/api/admin/precios", {
        headers: parsed?.token ? { Authorization: `Bearer ${parsed.token}` } : {},
      });
      const data = await res.json();
      if (data.stats) setPrecioStats(data.stats);
    } catch (e) {
      console.error("Error cargando precios:", e);
    }
  };

  const ajustarPrecios = async (porcentaje: number) => {
    if (!confirm(`¿Confirmás ajustar todos los precios un ${porcentaje > 0 ? "+" : ""}${porcentaje}%?`)) return;
    setAjustandoPrecios(true);
    setMensajeAjuste("");
    try {
      const token = localStorage.getItem("admin_catalogo_session");
      const parsed = token ? JSON.parse(token) : null;
      const res = await fetch("/api/admin/precios", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(parsed?.token ? { Authorization: `Bearer ${parsed.token}` } : {}),
        },
        body: JSON.stringify({ porcentaje }),
      });
      const data = await res.json();
      if (data.success) {
        setMensajeAjuste(`Precios actualizados: ${data.actualizados} productos ajustados ${porcentaje > 0 ? "+" : ""}${porcentaje}%`);
        cargarPrecios();
      } else {
        setMensajeAjuste("Error: " + (data.error || "Desconocido"));
      }
    } catch (e: any) {
      setMensajeAjuste("Error de red: " + e.message);
    } finally {
      setAjustandoPrecios(false);
    }
  };

  const buscarProductoSku = async () => {
    const sku = skuBuscar.trim();
    if (!sku) return;
    setLoadingProducto(true);
    setMensajeProducto("");
    setProductoEdit(null);
    try {
      const res = await fetch(`/api/catalogo/precios-sku?sku=${encodeURIComponent(sku)}`);
      const data = await res.json();
      if (!res.ok) {
        setMensajeProducto(data.error || "Producto no encontrado");
        return;
      }
      const p = data.producto;
      setProductoEdit(p);
      setPrecioNormalEdit(String(p.catalog_price || ""));
      setEnOfertaEdit(p.on_sale || false);
      setPctDescuentoEdit(String(p.discount_pct || ""));
      setPrecioOfertaEdit(p.discount_price ? String(p.discount_price) : "");
    } catch (e: any) {
      setMensajeProducto("Error: " + e.message);
    } finally {
      setLoadingProducto(false);
    }
  };

  const guardarProductoSku = async () => {
    if (!productoEdit) return;
    setGuardandoProducto(true);
    setMensajeProducto("");
    try {
      const body: Record<string, unknown> = {
        sku: productoEdit.sku,
        catalog_price: Number(precioNormalEdit) || 0,
        on_sale: enOfertaEdit,
      };
      if (enOfertaEdit) {
        const oferta = Number(precioOfertaEdit);
        body.discount_price = oferta > 0 && oferta < Number(precioNormalEdit) ? oferta : null;
        const pct = Number(pctDescuentoEdit);
        body.discount_pct = pct > 0 && pct <= 100 ? pct : 0;
      } else {
        body.discount_price = null;
        body.discount_pct = 0;
      }
      const res = await fetch("/api/catalogo/precios-sku", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setMensajeProducto("Error: " + (data.error || "Desconocido"));
        return;
      }
      setMensajeProducto(`Guardado: ${data.producto.sku}`);
      setProductoEdit(data.producto);
      cargarPrecios();
    } catch (e: any) {
      setMensajeProducto("Error: " + e.message);
    } finally {
      setGuardandoProducto(false);
    }
  };

  const actualizarEstado = async (id: string, estado: string) => {
    try {
      await fetch("/api/admin/pedidos", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, estado }),
      });
      await cargarPedidos();
      // Refrescar selected con datos actualizados
      const refreshed = pedidos.find((p) => p.id === id);
      if (refreshed) setSelected(refreshed);
    } catch (e) {
      console.error(e);
    }
  };

  const asignarGerente = async (vendedorId: string, nuevoGerenteId: string | null, esGerente?: boolean) => {
    setGuardandoGerente(vendedorId);
    try {
      const res = await fetch("/api/admin/vendedores/gerente", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ vendedor_id: vendedorId, lider_id: nuevoGerenteId, es_gerente: esGerente }),
      });
      if (!res.ok) {
        const e = await res.json();
        alert(e.error || "Error al guardar");
      } else {
        await cargarVendedores();
      }
    } catch {
      alert("Error al guardar");
    } finally {
      setGuardandoGerente(null);
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

  const cambiarVista = (v: Vista) => {
    setVistaActiva(v);
    router.replace(`/catalogo/admin/pedidos?tab=${v}`, { scroll: false });
  };

  if (!admin) return null;

  const tabs = [
    { id: "dashboard", label: "Dashboard", icon: BarChart3 },
    { id: "pedidos", label: "Pedidos", icon: Package },
    { id: "vendedores", label: "Vendedores", icon: Store },
    { id: "gerentes", label: "Gerentes", icon: Award },
    { id: "clientes", label: "Clientes", icon: Users },
    { id: "precios", label: "Precios", icon: Percent },
    { id: "finanzas", label: "Finanzas", icon: Wallet },
  ];

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: "#080c16" }}>
      {/* HEADER */}
      <header className="border-b border-gray-800 px-6 py-4" style={{ backgroundColor: "#111827" }}>
        <div className="mx-auto max-w-7xl">
          <div className="flex justify-between items-start mb-5">
            <div>
              <button
                onClick={() => router.push("/catalogo")}
                className="mb-3 flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors"
              >
                <ArrowLeft className="h-4 w-4" /> Volver al catálogo
              </button>
              <div className="flex items-center gap-3">
                <Shield className="h-6 w-6 text-orange-500" />
                <h1 className="text-2xl font-bold text-white">Panel de Pedidos</h1>
              </div>
              <p className="text-sm text-gray-500 mt-1">Admin: {admin.nombre} ({admin.email})</p>
            </div>
            <div className="flex gap-3">
              {/* Notificaciones */}
              <div className="relative">
                <button
                  onClick={() => setNotifOpen(!notifOpen)}
                  className="relative flex items-center gap-2 px-4 py-2 rounded-md border border-gray-700 text-gray-300 hover:bg-gray-800 transition-colors text-sm"
                >
                  <Megaphone className="h-4 w-4" />
                  {notificaciones.length > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold rounded-full h-4 w-4 flex items-center justify-center">
                      {notificaciones.length}
                    </span>
                  )}
                </button>
                {notifOpen && (
                  <div className="absolute right-0 mt-2 w-80 rounded-xl border border-gray-700 bg-[#1a1a1a] shadow-xl z-50 overflow-hidden">
                    <div className="p-3 border-b border-gray-700 flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-white">Notificaciones</span>
                        {notificaciones.length > 0 && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-red-500/20 text-red-400 border border-red-500/30">{notificaciones.length}</span>
                        )}
                      </div>
                      {notificaciones.length > 0 && (
                        <button onClick={marcarTodasLeidas} className="text-[10px] text-gray-500 hover:text-orange-400 transition-colors">
                          Limpiar todo
                        </button>
                      )}
                    </div>
                    <div className="max-h-80 overflow-y-auto divide-y divide-gray-800">
                      {notificaciones.length === 0 ? (
                        <div className="p-6 text-center">
                          <p className="text-xs text-gray-500">No hay notificaciones</p>
                        </div>
                      ) : (
                        notificaciones.map((n) => {
                          const tipoIcono: Record<string, { icon: string; color: string }> = {
                            nuevo_pedido:   { icon: "🛒", color: "text-orange-400" },
                            nuevo_cliente:  { icon: "👤", color: "text-blue-400" },
                            nuevo_vendedor: { icon: "🤝", color: "text-green-400" },
                            cambio_vendedor:{ icon: "🔄", color: "text-purple-400" },
                            error:          { icon: "⚠️", color: "text-red-400" },
                          };
                          const cfg = tipoIcono[n.tipo] || { icon: "🔔", color: "text-gray-400" };
                          return (
                            <div key={n.id} className="p-3 hover:bg-gray-800/40 transition-colors">
                              <div className="flex items-start gap-2">
                                <span className="text-base leading-none mt-0.5 shrink-0">{cfg.icon}</span>
                                <div className="flex-1 min-w-0">
                                  <div className="flex justify-between items-start gap-1">
                                    <p className={`text-xs font-bold truncate ${cfg.color}`}>{n.titulo}</p>
                                    <button
                                      onClick={() => marcarNotifLeida(n.id)}
                                      className="shrink-0 text-gray-600 hover:text-white transition-colors text-xs leading-none"
                                    >
                                      ✕
                                    </button>
                                  </div>
                                  <p className="text-[10px] text-gray-300 mt-0.5 leading-relaxed">{n.mensaje}</p>
                                  <p className="text-[10px] text-gray-600 mt-1">
                                    {new Date(n.created_at).toLocaleString("es-AR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                                  </p>
                                </div>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}
              </div>

              <button
                onClick={() => router.push("/catalogo/admin/seguridad")}
                className="flex items-center gap-2 px-4 py-2 rounded-md border border-gray-700 text-gray-300 hover:bg-gray-800 transition-colors text-sm"
              >
                <Shield className="h-4 w-4 text-orange-500" /> Seguridad
              </button>
              <button
                onClick={logout}
                className="flex items-center gap-2 px-4 py-2 rounded-md border border-gray-700 text-gray-300 hover:bg-gray-800 transition-colors text-sm"
              >
                Cerrar sesión
              </button>
            </div>
          </div>
          {/* Tabs */}
          <nav className="flex gap-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => cambiarVista(tab.id as Vista)}
                className={`flex items-center gap-2 px-4 py-2 rounded-t-md font-medium text-sm transition-colors ${
                  vistaActiva === tab.id
                    ? "bg-orange-600/10 text-orange-500 border border-orange-600/30 border-b-0"
                    : "text-gray-400 hover:text-white hover:bg-gray-800"
                }`}
              >
                <tab.icon className="h-4 w-4" />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </header>

      {/* CONTENT */}
      <main className="flex-grow p-6">
        <div className="mx-auto max-w-7xl">

      {/* === DASHBOARD === */}
      {vistaActiva === "dashboard" && loadingDashboard && (
        <div className="mt-24 flex flex-col items-center gap-3 text-gray-400">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-orange-500 border-t-transparent" />
          <span className="text-sm">Cargando dashboard...</span>
        </div>
      )}
      {vistaActiva === "dashboard" && !loadingDashboard && dashboardError && (
        <div className="mt-10 rounded-xl border border-red-800 bg-red-950/40 p-6 text-center">
          <p className="text-red-400 font-semibold mb-1">Error al cargar estadísticas</p>
          <p className="text-xs text-gray-400 mb-3">{dashboardError}</p>
          <button onClick={cargarDashboard} className="rounded-md border border-gray-700 px-4 py-2 text-sm text-gray-300 hover:bg-gray-800">Reintentar</button>
        </div>
      )}
      {vistaActiva === "dashboard" && !loadingDashboard && !dashboardError && stats && (
        <div className="space-y-6">
          {/* KPIs */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="rounded-xl p-5 border border-gray-800 shadow-lg" style={{ backgroundColor: "#111827" }}>
              <div className="flex justify-between items-start mb-2">
                <div>
                  <p className="text-gray-400 text-xs font-semibold uppercase tracking-wider">Ventas Totales (Mes)</p>
                  <h3 className="text-2xl font-bold text-white mt-1">{fmtMoney(stats.ventasMes)}</h3>
                </div>
                <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center text-green-500">
                  <TrendingUp className="h-5 w-5" />
                </div>
              </div>
              <p className="text-xs text-green-400 flex items-center gap-1"><TrendingUp className="h-3 w-3" /> {stats.ventasSemana > 0 ? "Semana activa" : "Sin movimientos esta semana"}</p>
            </div>
            <div className="rounded-xl p-5 border border-gray-800 shadow-lg" style={{ backgroundColor: "#111827" }}>
              <div className="flex justify-between items-start mb-2">
                <div>
                  <p className="text-gray-400 text-xs font-semibold uppercase tracking-wider">Comisiones MADSJEEZ</p>
                  <h3 className="text-2xl font-bold text-white mt-1">{fmtMoney(stats.comisionesPendientes + stats.comisionesPagadas)}</h3>
                </div>
                <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: "rgba(234,88,12,0.1)", color: "#ea580c" }}>
                  <DollarSign className="h-5 w-5" />
                </div>
              </div>
              <p className="text-xs text-green-400 flex items-center gap-1"><TrendingUp className="h-3 w-3" /> Pendientes: {fmtMoney(stats.comisionesPendientes)}</p>
            </div>
            <div className="rounded-xl p-5 border border-gray-800 shadow-lg" style={{ backgroundColor: "#111827" }}>
              <div className="flex justify-between items-start mb-2">
                <div>
                  <p className="text-gray-400 text-xs font-semibold uppercase tracking-wider">Pedidos en Curso</p>
                  <h3 className="text-2xl font-bold text-white mt-1">{pedidos.filter(p => !["entregado", "cancelado"].includes(p.estado)).length}</h3>
                </div>
                <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-500">
                  <Truck className="h-5 w-5" />
                </div>
              </div>
              <p className="text-xs text-gray-500 flex items-center gap-1">{pedidos.filter(p => p.estado === "enviado").length} despachados</p>
            </div>
            <div className="rounded-xl p-5 border shadow-[0_0_15px_rgba(220,38,38,0.15)]" style={{ backgroundColor: "#111827", borderColor: "rgba(220,38,38,0.3)" }}>
              <div className="flex justify-between items-start mb-2">
                <div>
                  <p className="text-gray-400 text-xs font-semibold uppercase tracking-wider">Problemas / Reclamos</p>
                  <h3 className="text-2xl font-bold text-red-500 mt-1">{pedidos.filter(p => p.estado === "cancelado").length}</h3>
                </div>
                <div className="w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center text-red-500">
                  <AlertTriangle className="h-5 w-5" />
                </div>
              </div>
              <p className="text-xs text-red-500 flex items-center gap-1"><Clock className="h-3 w-3" /> Requieren atención urgente</p>
            </div>
          </div>

          {/* Estructura de Equipos — gerentes y sus vendedores */}
          {vendedores.filter(v => v.es_gerente).length > 0 && (
            <div className="rounded-xl border border-purple-500/20 shadow-lg overflow-hidden" style={{ backgroundColor: "#111827" }}>
              <div className="px-5 py-3 border-b border-gray-800 flex items-center justify-between">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Award className="h-4 w-4 text-purple-400" /> Estructura de Equipos
                  <span className="text-[10px] font-normal text-gray-500 ml-1">
                    {vendedores.filter(v => v.es_gerente).length} gerente{vendedores.filter(v => v.es_gerente).length !== 1 ? "s" : ""} ·{" "}
                    {vendedores.filter(v => !v.es_gerente && v.lider_id).length} vendedor{vendedores.filter(v => !v.es_gerente && v.lider_id).length !== 1 ? "es" : ""} asignado{vendedores.filter(v => !v.es_gerente && v.lider_id).length !== 1 ? "s" : ""} ·{" "}
                    {vendedores.filter(v => !v.es_gerente && !v.lider_id).length} sin gerente
                  </span>
                </h3>
                <button onClick={() => cambiarVista("gerentes")} className="text-xs text-purple-400 hover:text-white transition">Ver detalle →</button>
              </div>
              <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {vendedores.filter(v => v.es_gerente).map(gerente => {
                  const equipo = vendedores.filter(s => s.lider_id === gerente.id);
                  const ventasEquipo = equipo.reduce((sum, s) =>
                    sum + pedidos.filter(p => p.vendedor_id === s.id && p.estado !== "cancelado").reduce((ps, p) => ps + (p.total || 0), 0), 0);
                  return (
                    <div key={gerente.id} className="rounded-xl p-4 border border-purple-500/15" style={{ background: "rgba(88,28,135,0.08)" }}>
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-9 h-9 rounded-full bg-purple-900/50 border border-purple-500/30 flex items-center justify-center font-black text-purple-300 text-sm flex-shrink-0">
                          {gerente.nombre.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="text-white font-bold text-sm truncate">{gerente.nombre}</p>
                          <p className="text-[10px] text-gray-500 font-mono">{gerente.codigo_referido}</p>
                        </div>
                        <span className="ml-auto text-[10px] rounded-full border border-purple-500/30 bg-purple-500/10 px-2 py-0.5 text-purple-300 whitespace-nowrap">👑 Gerente</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <Users className="h-3.5 w-3.5 text-gray-500" />
                          <span className="text-sm font-black text-white">{equipo.length}</span>
                          <span className="text-xs text-gray-500">vendedor{equipo.length !== 1 ? "es" : ""}</span>
                        </div>
                        <span className="text-xs font-bold text-green-400">{fmtMoney(ventasEquipo)}</span>
                      </div>
                      {equipo.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {equipo.map(s => (
                            <span key={s.id} className="text-[10px] px-1.5 py-0.5 rounded bg-gray-800 text-gray-400 border border-gray-700">{s.nombre.split(" ")[0]}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
                {/* Vendedores sin gerente */}
                {vendedores.filter(v => !v.es_gerente && !v.lider_id).length > 0 && (
                  <div className="rounded-xl p-4 border border-gray-700/40" style={{ background: "rgba(255,255,255,0.02)" }}>
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-9 h-9 rounded-full bg-gray-800 border border-gray-700 flex items-center justify-center">
                        <Users className="h-4 w-4 text-gray-500" />
                      </div>
                      <div>
                        <p className="text-gray-400 font-bold text-sm">Sin gerente</p>
                        <p className="text-[10px] text-gray-600">Vendedores independientes</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-black text-white">{vendedores.filter(v => !v.es_gerente && !v.lider_id).length}</span>
                      <span className="text-xs text-gray-500">vendedor{vendedores.filter(v => !v.es_gerente && !v.lider_id).length !== 1 ? "es" : ""}</span>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {vendedores.filter(v => !v.es_gerente && !v.lider_id).slice(0, 6).map(s => (
                        <span key={s.id} className="text-[10px] px-1.5 py-0.5 rounded bg-gray-800 text-gray-400 border border-gray-700">{s.nombre.split(" ")[0]}</span>
                      ))}
                      {vendedores.filter(v => !v.es_gerente && !v.lider_id).length > 6 && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-800 text-gray-500 border border-gray-700">+{vendedores.filter(v => !v.es_gerente && !v.lider_id).length - 6} más</span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Gráficos */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 rounded-xl p-6 border border-gray-800 shadow-lg" style={{ backgroundColor: "#111827" }}>
              <h3 className="text-lg font-bold text-white mb-4">Evolución de Ventas y Comisiones</h3>
              <div className="relative h-64 w-full">
                {evolucion ? (
                  <Line
                    data={{
                      labels: evolucion.labels,
                      datasets: [
                        { label: "Ventas ($)", data: evolucion.ventas, borderColor: "#10b981", backgroundColor: "rgba(16,185,129,0.1)", borderWidth: 2, tension: 0.4, fill: true, pointRadius: 3 },
                        { label: "Comisiones ($)", data: evolucion.comisiones, borderColor: "#ea580c", backgroundColor: "rgba(234,88,12,0.1)", borderWidth: 2, tension: 0.4, fill: true, pointRadius: 3 },
                      ],
                    }}
                    options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { position: "top", labels: { color: "#9ca3af" } } }, scales: { y: { beginAtZero: true, grid: { color: "#1f2937" }, ticks: { color: "#9ca3af" } }, x: { grid: { color: "#1f2937" }, ticks: { color: "#9ca3af" } } } }}
                  />
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-600 text-sm">Sin datos de evolución</div>
                )}
              </div>
            </div>
            <div className="rounded-xl p-6 border border-gray-800 shadow-lg" style={{ backgroundColor: "#111827" }}>
              <h3 className="text-lg font-bold text-white mb-4">Estado de Despachos</h3>
              <div className="relative h-52 w-full flex justify-center">
                {Object.keys(pedidosPorEstado).length > 0 ? (
                  <Doughnut
                    data={{ labels: ["Pendiente","Confirmado","Pagado","Enviado","Entregado","Cancelado"], datasets: [{ data: [pedidosPorEstado.pendiente||0,pedidosPorEstado.confirmado||0,pedidosPorEstado.pagado||0,pedidosPorEstado.enviado||0,pedidosPorEstado.entregado||0,pedidosPorEstado.cancelado||0], backgroundColor: ["#eab308","#3b82f6","#10b981","#8b5cf6","#34d399","#ef4444"], borderWidth: 0, hoverOffset: 4 }] }}
                    options={{ responsive: true, maintainAspectRatio: false, cutout: "75%", plugins: { legend: { display: false } } }}
                  />
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-600 text-sm">Sin datos</div>
                )}
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2 text-xs text-gray-400">
                <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-yellow-500 flex-shrink-0" />Pendiente</div>
                <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-blue-500 flex-shrink-0" />Confirmado</div>
                <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-green-500 flex-shrink-0" />Pagado</div>
                <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-purple-500 flex-shrink-0" />Enviado</div>
                <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-emerald-400 flex-shrink-0" />Entregado</div>
                <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-red-500 flex-shrink-0" />Cancelado</div>
              </div>
            </div>
          </div>

          {/* Ranking y Alertas */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Top Vendedores */}
            <div className="rounded-xl border border-gray-800 shadow-lg overflow-hidden" style={{ backgroundColor: "#111827" }}>
              <div className="p-4 border-b border-gray-800 flex justify-between items-center">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <Award className="h-4 w-4 text-yellow-500" /> Top Vendedores
                </h3>
                <button onClick={exportarVendedores} className="text-xs text-orange-500 hover:text-white transition">Ver todos</button>
              </div>
              <table className="w-full text-sm">
                <tbody>
                  {vendedores.slice(0, 5).map((v) => (
                    <tr key={v.id} className="border-b border-gray-800/50 hover:bg-gray-800/30 transition">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center font-bold text-white text-xs flex-shrink-0">{v.nombre.charAt(0).toUpperCase()}</div>
                          <div>
                            <p className="text-white font-medium">{v.nombre}</p>
                            <p className="text-xs text-gray-500">{v.comision_pct}% comisión{v.es_gerente ? " · 👑 Gerente" : ""}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right text-green-400 font-medium whitespace-nowrap">{fmtMoney(v.total_vendido)}</td>
                    </tr>
                  ))}
                  {vendedores.length === 0 && (
                    <tr><td colSpan={2} className="py-8 text-center text-gray-600 text-sm">Sin vendedores</td></tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Compradores VIP */}
            <div className="rounded-xl border border-gray-800 shadow-lg overflow-hidden" style={{ backgroundColor: "#111827" }}>
              <div className="p-4 border-b border-gray-800 flex justify-between items-center">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <Star className="h-4 w-4 text-blue-400" /> Compradores VIP
                </h3>
                <button onClick={exportarClientes} className="text-xs text-orange-500 hover:text-white transition">Ver todos</button>
              </div>
              <table className="w-full text-sm">
                <tbody>
                  {clientes.slice(0, 5).map((c) => (
                    <tr key={c.id} className="border-b border-gray-800/50 hover:bg-gray-800/30 transition">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center font-bold text-white text-xs flex-shrink-0">{c.nombre ? c.nombre.charAt(0).toUpperCase() : "?"}</div>
                          <div>
                            <p className="text-white font-medium">{c.nombre || "Sin nombre"}</p>
                            <p className="text-xs text-gray-500">{c.email || "-"}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right text-gray-400 text-xs whitespace-nowrap">{new Date(c.created_at).toLocaleDateString("es-AR")}</td>
                    </tr>
                  ))}
                  {clientes.length === 0 && (
                    <tr><td colSpan={2} className="py-8 text-center text-gray-600 text-sm">Sin clientes</td></tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Alertas */}
            <div className="rounded-xl border border-gray-800 shadow-lg overflow-hidden" style={{ backgroundColor: "#111827" }}>
              <div className="p-4 border-b border-gray-800 bg-red-500/5">
                <h3 className="text-sm font-bold text-red-500 uppercase tracking-wider flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" /> Alertas de Pedidos
                </h3>
              </div>
              <div className="p-4 space-y-3">
                {pedidos.filter(p => p.estado === "cancelado").slice(0, 3).map((p) => (
                  <div key={p.id} className="rounded-lg p-3 border border-gray-800" style={{ backgroundColor: "#080c16" }}>
                    <div className="flex justify-between items-start mb-1">
                      <span className="text-xs font-bold text-red-400">#{p.id.slice(0, 8).toUpperCase()}</span>
                      <span className="text-[10px] bg-red-500/20 text-red-400 px-2 py-0.5 rounded">Cancelado</span>
                    </div>
                    <p className="text-sm text-white mb-2">{p.items?.map((i: any) => i.nombre).slice(0, 2).join(", ") || "Sin items"}</p>
                    <div className="flex justify-between items-center text-xs text-gray-500">
                      <span>Total: {fmtMoney(p.total)}</span>
                      <button onClick={() => setSelected(p)} className="text-orange-500 hover:text-white">Gestionar</button>
                    </div>
                  </div>
                ))}
                {pedidos.filter(p => p.estado === "cancelado").length === 0 && (
                  <div className="text-center text-gray-600 text-sm py-6">Sin pedidos cancelados</div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* === PEDIDOS === */}
      {vistaActiva === "pedidos" && (
        <>
          {/* Stats pedidos */}
          <div className="mt-4 grid gap-3 sm:grid-cols-4">
            <StatCard label="Total pedidos" value={String(pedidos.length)} />
            <StatCard label="Pendientes" value={String(pedidos.filter((p) => p.estado === "pendiente").length)} color="yellow" />
            <StatCard label="Ventas totales" value={fmtMoney(pedidos.reduce((s, p) => s + (p.estado !== "cancelado" ? p.total : 0), 0))} color="green" />
            <StatCard label="Comisiones pendientes" value={fmtMoney(pedidos.reduce((s, p) => s + (p.comision_estado === "pendiente" ? p.comision_monto : 0), 0))} color="orange" />
          </div>

          {/* Filtros */}
          <div className="mt-4 flex flex-wrap gap-2">
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
            <div className="mt-4 space-y-3">
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
                        <span className="text-[10px] text-gray-500 flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {fmtFechaHora(p.created_at)}
                        </span>
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
                        {p.datos_cliente?.telefono || "-"} · {p.datos_cliente?.localidad || "-"}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-[#FF5722]">{fmtMoney(p.total)}</p>
                      <p className="text-[10px] text-gray-500">
                        {p.estado === "pendiente" ? (
                          <span className="flex items-center gap-1 text-yellow-400"><Clock className="h-3 w-3" />Pendiente</span>
                        ) : p.estado === "confirmado" ? (
                          <span className="flex items-center gap-1 text-blue-400"><Check className="h-3 w-3" />Confirmado</span>
                        ) : p.estado === "pagado" ? (
                          <span className="flex items-center gap-1 text-[#39FF14]"><DollarSign className="h-3 w-3" />Pagado</span>
                        ) : p.estado === "enviado" ? (
                          <span className="flex items-center gap-1 text-purple-400"><Truck className="h-3 w-3" />Enviado</span>
                        ) : p.estado === "entregado" ? (
                          <span className="flex items-center gap-1 text-[#39FF14]"><Check className="h-3 w-3" />Entregado</span>
                        ) : (
                          <span className="flex items-center gap-1 text-red-400"><X className="h-3 w-3" />Cancelado</span>
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1 text-[10px] text-gray-500">
                    {p.items.slice(0, 3).map((item, i) => (
                      <span key={i} className="rounded bg-white/5 px-1.5 py-0.5">
                        {item.cantidad}x {item.nombre}
                      </span>
                    ))}
                    {p.items.length > 3 && (
                      <span className="rounded bg-white/5 px-1.5 py-0.5">+{p.items.length - 3} más</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* === VENDEDORES === */}
      {vistaActiva === "vendedores" && (
        <div className="mt-4 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Store className="h-5 w-5 text-[#FF5722]" />
              Vendedores ({vendedores.length})
            </h2>
            <button onClick={exportarVendedores} className="flex items-center gap-1 rounded-lg border border-white/10 px-3 py-1.5 text-xs text-gray-400 hover:text-white hover:bg-white/5">
              <Download className="h-3.5 w-3.5" /> Exportar CSV
            </button>
          </div>
          {vendedores.length === 0 ? (
            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-8 text-center text-gray-400">
              No hay vendedores registrados.
            </div>
          ) : (
            <div className="space-y-2">
              {vendedores.map((v) => {
                const gerenteActual = vendedores.find(g => g.id === v.lider_id);
                const gerentes = vendedores.filter(g => g.es_gerente && g.id !== v.id);
                const subordinados = vendedores.filter(s => s.lider_id === v.id);
                return (
                  <div key={v.id} className={`rounded-xl border bg-white/[0.03] p-4 text-sm ${v.es_gerente ? "border-purple-500/30" : "border-white/10"}`}>
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`rounded-full border px-2 py-0.5 text-[10px] capitalize ${getColorNivel(v.nivel_vendedor)}`}>
                          {v.nivel_vendedor?.replace("_", " ") || "nuevo"}
                        </span>
                        {v.es_gerente && (
                          <span className="rounded-full border border-purple-500/30 bg-purple-500/10 px-2 py-0.5 text-[10px] text-purple-300">
                            👑 Gerente
                          </span>
                        )}
                        <span className="text-white font-semibold">{v.nombre}</span>
                        {v.es_gerente && subordinados.length > 0 && (
                          <span className="text-[10px] text-gray-400">{subordinados.length} vendedor{subordinados.length > 1 ? "es" : ""} a cargo</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-[#39FF14]">{fmtMoney(v.total_vendido)}</span>
                      </div>
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-gray-400">
                      <span>{v.email}</span>
                      <span>Ref: {v.codigo_referido}</span>
                      <span>Comisión: {v.comision_pct}{v.lider_id ? "+3" : ""}%</span>
                      {gerenteActual && <span className="text-purple-300">Gerente: {gerenteActual.nombre}</span>}
                    </div>
                    {/* Panel de gestión de jerarquía */}
                    <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-white/5 pt-3">
                      {/* Toggle Gerente */}
                      <label className="flex items-center gap-2 cursor-pointer">
                        <span className="text-xs text-gray-400">Es Gerente</span>
                        <button
                          onClick={() => asignarGerente(v.id, v.lider_id || null, !v.es_gerente)}
                          disabled={guardandoGerente === v.id}
                          className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${v.es_gerente ? "bg-purple-600" : "bg-gray-600"} disabled:opacity-50`}
                        >
                          <span className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${v.es_gerente ? "translate-x-5" : "translate-x-1"}`} />
                        </button>
                      </label>
                      {/* Asignar Gerente (solo si NO es gerente) */}
                      {!v.es_gerente && (
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-400">Asignar Gerente:</span>
                          <select
                            className="rounded-lg border border-white/10 bg-[#1a1a1a] px-2 py-1 text-xs text-white"
                            value={asignandoGerenteId[v.id] ?? (v.lider_id || "")}
                            onChange={(e) => setAsignandoGerenteId(prev => ({ ...prev, [v.id]: e.target.value }))}
                          >
                            <option value="">Sin gerente</option>
                            {gerentes.map(g => (
                              <option key={g.id} value={g.id}>{g.nombre}</option>
                            ))}
                          </select>
                          <button
                            onClick={() => {
                              const sel = asignandoGerenteId[v.id] ?? (v.lider_id || "");
                              asignarGerente(v.id, sel || null, v.es_gerente);
                            }}
                            disabled={guardandoGerente === v.id}
                            className="rounded-lg border border-white/10 px-2 py-1 text-xs text-gray-400 hover:text-white hover:bg-white/5 disabled:opacity-50"
                          >
                            {guardandoGerente === v.id ? "..." : "Guardar"}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* === GERENTES === */}
      {vistaActiva === "gerentes" && (
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Award className="h-5 w-5 text-purple-400" />
              Gerentes de Ventas
              <span className="text-xs font-normal text-gray-500 ml-1">— Ganan 10% de las comisiones de sus vendedores</span>
            </h2>
            <span className="text-sm text-gray-500">{vendedores.filter(v => v.es_gerente).length} gerentes activos</span>
          </div>

          {/* Lista de gerentes */}
          {vendedores.filter(v => v.es_gerente).length === 0 ? (
            <div className="rounded-xl border border-gray-800 p-10 text-center" style={{ backgroundColor: "#111827" }}>
              <Award className="h-10 w-10 text-gray-700 mx-auto mb-3" />
              <p className="text-gray-400 font-medium mb-1">No hay gerentes asignados</p>
              <p className="text-xs text-gray-600 mb-4">Podés promover vendedores desde la pestaña Vendedores</p>
              <button
                onClick={() => cambiarVista("vendedores")}
                className="px-4 py-2 rounded-md border border-gray-700 text-sm text-gray-300 hover:bg-gray-800 transition-colors"
              >
                Ir a Vendedores
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {vendedores.filter(v => v.es_gerente).map(gerente => {
                const equipo = vendedores.filter(s => s.lider_id === gerente.id);
                const ventasEquipo = equipo.reduce((sum, s) => {
                  return sum + pedidos
                    .filter(p => p.vendedor_id === s.id && p.estado !== "cancelado")
                    .reduce((ps, p) => ps + (p.total || 0), 0);
                }, 0);
                const comisionesEquipo = equipo.reduce((sum, s) => {
                  return sum + pedidos
                    .filter(p => p.vendedor_id === s.id && p.estado !== "cancelado")
                    .reduce((ps, p) => ps + (p.comision_monto || 0), 0);
                }, 0);
                const comisionGerente = comisionesEquipo * 0.10;
                return (
                  <div key={gerente.id} className="rounded-xl border border-purple-500/20 shadow-lg overflow-hidden" style={{ backgroundColor: "#111827" }}>
                    {/* Cabecera gerente */}
                    <div className="p-5 border-b border-gray-800 flex flex-wrap items-center justify-between gap-4">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-purple-900/50 border border-purple-500/30 flex items-center justify-center font-bold text-purple-300 text-lg flex-shrink-0">
                          {gerente.nombre.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="text-white font-bold text-base">{gerente.nombre}</span>
                            <span className="text-[10px] rounded-full border border-purple-500/30 bg-purple-500/10 px-2 py-0.5 text-purple-300">👑 Gerente</span>
                          </div>
                          <p className="text-xs text-gray-500">{gerente.email} · Ref: <span className="text-gray-400 font-mono">{gerente.codigo_referido}</span></p>
                          <p className="text-xs text-gray-600 mt-0.5">Comisión propia: {gerente.comision_pct}% · {equipo.length} vendedor{equipo.length !== 1 ? "es" : ""} a cargo</p>
                        </div>
                      </div>
                      <div className="flex gap-4 text-right">
                        <div>
                          <p className="text-[10px] text-gray-500 uppercase tracking-wider">Ventas equipo</p>
                          <p className="text-lg font-bold text-green-400">{fmtMoney(ventasEquipo)}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-gray-500 uppercase tracking-wider">Comisión gerente (10%)</p>
                          <p className="text-lg font-bold text-purple-400">{fmtMoney(comisionGerente)}</p>
                        </div>
                      </div>
                    </div>

                    {/* Tabla de vendedores del equipo */}
                    {equipo.length === 0 ? (
                      <div className="p-5 text-center text-gray-600 text-sm">Sin vendedores asignados aún</div>
                    ) : (
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-gray-800" style={{ backgroundColor: "rgba(0,0,0,0.2)" }}>
                            <th className="text-left py-2 px-5 text-xs text-gray-500 font-semibold">Vendedor</th>
                            <th className="text-right py-2 px-5 text-xs text-gray-500 font-semibold">Pedidos</th>
                            <th className="text-right py-2 px-5 text-xs text-gray-500 font-semibold">Ventas</th>
                            <th className="text-right py-2 px-5 text-xs text-gray-500 font-semibold">Comisión vendedor</th>
                            <th className="text-right py-2 px-5 text-xs text-gray-500 font-semibold">10% → gerente</th>
                          </tr>
                        </thead>
                        <tbody>
                          {equipo.map(sub => {
                            const pedidosSub = pedidos.filter(p => p.vendedor_id === sub.id && p.estado !== "cancelado");
                            const ventasSub = pedidosSub.reduce((s, p) => s + (p.total || 0), 0);
                            const comisionSub = pedidosSub.reduce((s, p) => s + (p.comision_monto || 0), 0);
                            const parteGerente = comisionSub * 0.10;
                            return (
                              <tr key={sub.id} className="border-b border-gray-800/40 hover:bg-gray-800/20 transition">
                                <td className="py-3 px-5">
                                  <div className="flex items-center gap-3">
                                    <div className="w-7 h-7 rounded-full bg-gray-700 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
                                      {sub.nombre.charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                      <p className="text-white font-medium">{sub.nombre}</p>
                                      <p className="text-[10px] text-gray-500">{sub.email} · {sub.comision_pct}%+3% com.</p>
                                    </div>
                                  </div>
                                </td>
                                <td className="py-3 px-5 text-right text-gray-400 text-xs">{pedidosSub.length}</td>
                                <td className="py-3 px-5 text-right text-green-400 font-medium">{fmtMoney(ventasSub)}</td>
                                <td className="py-3 px-5 text-right text-orange-400">{fmtMoney(comisionSub)}</td>
                                <td className="py-3 px-5 text-right text-purple-400 font-bold">{fmtMoney(parteGerente)}</td>
                              </tr>
                            );
                          })}
                          <tr style={{ backgroundColor: "rgba(0,0,0,0.15)" }}>
                            <td colSpan={2} className="py-2 px-5 text-xs text-gray-500 font-semibold">Total equipo</td>
                            <td className="py-2 px-5 text-right text-green-300 text-xs font-bold">{fmtMoney(ventasEquipo)}</td>
                            <td className="py-2 px-5 text-right text-orange-300 text-xs font-bold">{fmtMoney(comisionesEquipo)}</td>
                            <td className="py-2 px-5 text-right text-purple-300 text-xs font-bold">{fmtMoney(comisionGerente)}</td>
                          </tr>
                        </tbody>
                      </table>
                    )}

                    {/* Acciones */}
                    <div className="px-5 py-3 border-t border-gray-800 flex items-center justify-between">
                      <p className="text-xs text-gray-600">Para gestionar el equipo, ir a la pestaña Vendedores</p>
                      <button
                        onClick={() => asignarGerente(gerente.id, gerente.lider_id || null, false)}
                        disabled={guardandoGerente === gerente.id}
                        className="px-3 py-1.5 text-xs rounded-md border border-red-800/50 text-red-400 hover:bg-red-900/20 transition disabled:opacity-50"
                      >
                        {guardandoGerente === gerente.id ? "..." : "Quitar rol gerente"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Vendedores sin gerente */}
          {vendedores.filter(v => !v.es_gerente && !v.lider_id).length > 0 && (
            <div className="rounded-xl border border-gray-800 overflow-hidden" style={{ backgroundColor: "#111827" }}>
              <div className="p-4 border-b border-gray-800">
                <h3 className="text-sm font-bold text-gray-400 flex items-center gap-2">
                  <Users className="h-4 w-4" /> Vendedores sin gerente asignado ({vendedores.filter(v => !v.es_gerente && !v.lider_id).length})
                </h3>
              </div>
              <div className="divide-y divide-gray-800/50">
                {vendedores.filter(v => !v.es_gerente && !v.lider_id).map(v => {
                  const gerentes = vendedores.filter(g => g.es_gerente);
                  return (
                    <div key={v.id} className="flex items-center justify-between px-5 py-3 hover:bg-gray-800/20 transition">
                      <div className="flex items-center gap-3">
                        <div className="w-7 h-7 rounded-full bg-gray-700 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
                          {v.nombre.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-white text-sm font-medium">{v.nombre}</p>
                          <p className="text-[10px] text-gray-500">{v.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {gerentes.length > 0 ? (
                          <>
                            <select
                              className="rounded-md border border-gray-700 bg-gray-900 px-2 py-1 text-xs text-white"
                              value={asignandoGerenteId[v.id] ?? ""}
                              onChange={(e) => setAsignandoGerenteId(prev => ({ ...prev, [v.id]: e.target.value }))}
                            >
                              <option value="">Asignar gerente...</option>
                              {gerentes.map(g => (
                                <option key={g.id} value={g.id}>{g.nombre}</option>
                              ))}
                            </select>
                            <button
                              onClick={() => {
                                const sel = asignandoGerenteId[v.id];
                                if (sel) asignarGerente(v.id, sel, false);
                              }}
                              disabled={!asignandoGerenteId[v.id] || guardandoGerente === v.id}
                              className="px-3 py-1 text-xs rounded-md border border-purple-700/50 text-purple-400 hover:bg-purple-900/20 transition disabled:opacity-40"
                            >
                              {guardandoGerente === v.id ? "..." : "Asignar"}
                            </button>
                          </>
                        ) : (
                          <span className="text-xs text-gray-600">Primero promové un gerente</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* === CLIENTES === */}
      {vistaActiva === "clientes" && (() => {
        // ── Derivar clientes invitados de pedidos ──
        type ClienteUnificado = {
          key: string;
          nombre: string;
          email: string;
          telefono: string;
          dni: string;
          tipo: "registrado" | "invitado";
          created_at: string;
          pedidosCount: number;
          totalComprado: number;
          ultimoPedido: string;
          vendedor?: string;
        };

        // Mapa para deduplicar: clave = dni || tel || email
        const mapaClientes = new Map<string, ClienteUnificado>();

        // 1. Registrados
        clientes.forEach(c => {
          const key = c.dni?.trim() || c.telefono?.trim() || c.email?.trim() || c.id;
          if (!mapaClientes.has(key)) {
            mapaClientes.set(key, {
              key, nombre: c.nombre, email: c.email, telefono: c.telefono,
              dni: c.dni, tipo: "registrado", created_at: c.created_at,
              pedidosCount: 0, totalComprado: 0, ultimoPedido: c.created_at, vendedor: undefined,
            });
          }
        });

        // 2. Invitados de pedidos
        pedidos.forEach(p => {
          const dc = p.datos_cliente;
          if (!dc) return;
          const nombre = dc.nombre?.trim() || "";
          const dni = dc.dni?.trim() || "";
          const tel = dc.telefono?.trim() || "";
          const email = "";
          const key = dni || tel || nombre || p.id;
          if (!key) return;
          const vendNombre = p.vendedor?.nombre;
          if (mapaClientes.has(key)) {
            const ex = mapaClientes.get(key)!;
            ex.pedidosCount += 1;
            ex.totalComprado += p.estado !== "cancelado" ? (p.total || 0) : 0;
            if (p.created_at > ex.ultimoPedido) ex.ultimoPedido = p.created_at;
          } else {
            mapaClientes.set(key, {
              key, nombre: nombre || "-", email, telefono: tel,
              dni, tipo: "invitado", created_at: p.created_at,
              pedidosCount: 1,
              totalComprado: p.estado !== "cancelado" ? (p.total || 0) : 0,
              ultimoPedido: p.created_at,
              vendedor: vendNombre,
            });
          }
        });

        // También sumar pedidos a registrados
        pedidos.forEach(p => {
          const dc = p.datos_cliente;
          if (!dc) return;
          const key = dc.dni?.trim() || dc.telefono?.trim() || dc.nombre?.trim() || "";
          if (!key) return;
          const ex = mapaClientes.get(key);
          if (ex && ex.tipo === "registrado") {
            ex.pedidosCount += 1;
            ex.totalComprado += p.estado !== "cancelado" ? (p.total || 0) : 0;
            if (p.created_at > ex.ultimoPedido) ex.ultimoPedido = p.created_at;
            if (!ex.vendedor && p.vendedor?.nombre) ex.vendedor = p.vendedor.nombre;
          }
        });

        const todos = Array.from(mapaClientes.values())
          .sort((a, b) => b.ultimoPedido.localeCompare(a.ultimoPedido));

        const q = busquedaCliente.toLowerCase().trim();
        const filtrados = q
          ? todos.filter(c =>
              c.nombre.toLowerCase().includes(q) ||
              c.dni.includes(q) ||
              c.telefono.includes(q) ||
              c.email.toLowerCase().includes(q)
            )
          : todos;

        const totalRegistrados = todos.filter(c => c.tipo === "registrado").length;
        const totalInvitados = todos.filter(c => c.tipo === "invitado").length;
        const totalComprado = todos.reduce((s, c) => s + c.totalComprado, 0);

        return (
          <div className="mt-4 space-y-4">
            {/* Header */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Users className="h-5 w-5 text-[#FF5722]" />
                Clientes ({todos.length})
              </h2>
              <button onClick={exportarClientes} className="flex items-center gap-1 rounded-lg border border-white/10 px-3 py-1.5 text-xs text-gray-400 hover:text-white hover:bg-white/5">
                <Download className="h-3.5 w-3.5" /> Exportar CSV
              </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3 text-center">
                <p className="text-2xl font-bold text-white">{todos.length}</p>
                <p className="text-xs text-gray-400 mt-0.5">Total clientes</p>
              </div>
              <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-3 text-center">
                <p className="text-2xl font-bold text-blue-400">{totalRegistrados}</p>
                <p className="text-xs text-gray-400 mt-0.5">Registrados</p>
              </div>
              <div className="rounded-xl border border-orange-500/20 bg-orange-500/5 p-3 text-center">
                <p className="text-2xl font-bold text-orange-400">{totalInvitados}</p>
                <p className="text-xs text-gray-400 mt-0.5">Invitados</p>
              </div>
              <div className="rounded-xl border border-green-500/20 bg-green-500/5 p-3 text-center">
                <p className="text-2xl font-bold text-green-400">{fmtMoney(totalComprado)}</p>
                <p className="text-xs text-gray-400 mt-0.5">Total comprado</p>
              </div>
            </div>

            {/* Búsqueda */}
            <input
              type="text"
              placeholder="Buscar por nombre, DNI, teléfono o email..."
              value={busquedaCliente}
              onChange={e => setBusquedaCliente(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-[#FF5722] placeholder-gray-600"
            />

            {/* Lista */}
            {filtrados.length === 0 ? (
              <div className="rounded-xl border border-white/10 bg-white/[0.03] p-8 text-center text-gray-400">
                {busquedaCliente ? "Sin resultados para esa búsqueda." : "No hay clientes aún."}
              </div>
            ) : (
              <div className="space-y-2">
                {filtrados.map((c) => (
                  <div key={c.key} className="rounded-xl border p-3 text-sm"
                    style={{ borderColor: c.tipo === "registrado" ? "rgba(59,130,246,0.2)" : "rgba(249,115,22,0.2)",
                             backgroundColor: c.tipo === "registrado" ? "rgba(59,130,246,0.03)" : "rgba(249,115,22,0.03)" }}>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs flex-shrink-0"
                          style={{ background: c.tipo === "registrado" ? "#1e3a5f" : "#3d1f0a",
                                   color: c.tipo === "registrado" ? "#60a5fa" : "#fb923c" }}>
                          {(c.nombre || "?").charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <span className="text-white font-semibold">{c.nombre || "-"}</span>
                          {c.vendedor && <span className="ml-2 text-[10px] text-purple-400">via {c.vendedor}</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          c.tipo === "registrado"
                            ? "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                            : "bg-orange-500/20 text-orange-400 border border-orange-500/30"
                        }`}>
                          {c.tipo === "registrado" ? "✓ Registrado" : "👤 Invitado"}
                        </span>
                        <span className="text-xs text-gray-500">{new Date(c.ultimoPedido).toLocaleDateString("es-AR")}</span>
                      </div>
                    </div>
                    <div className="mt-2 grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-1 text-xs text-gray-400">
                      {c.dni && <span><span className="text-gray-600">DNI:</span> {c.dni}</span>}
                      {c.telefono && <span><span className="text-gray-600">Tel:</span> {c.telefono}</span>}
                      {c.email && <span><span className="text-gray-600">Email:</span> {c.email}</span>}
                      <span><span className="text-gray-600">Pedidos:</span> <span className="text-white font-medium">{c.pedidosCount}</span></span>
                      {c.totalComprado > 0 && <span><span className="text-gray-600">Comprado:</span> <span className="text-green-400 font-medium">{fmtMoney(c.totalComprado)}</span></span>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })()}

      {/* === PRECIOS === */}
      {vistaActiva === "precios" && (
        <div className="mt-4 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Percent className="h-5 w-5 text-[#FF5722]" />
              Ajuste de Precios
            </h2>
            <button onClick={cargarPrecios} className="flex items-center gap-1 rounded-lg border border-white/10 px-3 py-1.5 text-xs text-gray-400 hover:text-white hover:bg-white/5">
              <RefreshCcw className="h-3.5 w-3.5" /> Actualizar
            </button>
          </div>

          {precioStats && (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard label="Total Productos" value={String(precioStats.total)} icon={<Package className="h-5 w-5 text-blue-400" />} color="blue" />
              <StatCard label="Activos" value={String(precioStats.activos)} icon={<Check className="h-5 w-5 text-[#39FF14]" />} color="green" />
              <StatCard label="Precio Promedio" value={fmtMoney(precioStats.precioPromedio)} icon={<DollarSign className="h-5 w-5 text-emerald-400" />} color="emerald" />
              <StatCard label="Rango" value={`${fmtMoney(precioStats.precioMin)} - ${fmtMoney(precioStats.precioMax)}`} icon={<TrendingUp className="h-5 w-5 text-yellow-400" />} color="yellow" />
            </div>
          )}

          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
            <h3 className="text-sm font-bold text-white mb-3">Ajustar todos los precios</h3>
            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-end">
              <div className="flex-grow">
                <label className="text-xs text-gray-400 mb-1 block">Porcentaje de ajuste</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={porcentajeAjuste}
                    onChange={(e) => setPorcentajeAjuste(e.target.value)}
                    placeholder="Ej: -50 para mitad, +20 para aumentar 20%"
                    className="w-full sm:w-64 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-[#FF5722]"
                  />
                  <span className="text-sm text-gray-400">%</span>
                </div>
                <p className="text-[10px] text-gray-500 mt-1">-50 = precio a la mitad | +20 = aumentar 20%</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => ajustarPrecios(Number(porcentajeAjuste))}
                  disabled={ajustandoPrecios || !porcentajeAjuste || isNaN(Number(porcentajeAjuste))}
                  className="rounded-lg bg-[#FF5722] px-4 py-2 text-sm font-bold text-white hover:bg-[#FF5722]/80 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {ajustandoPrecios ? "Aplicando..." : "Aplicar"}
                </button>
                <button
                  onClick={() => { setPorcentajeAjuste("-50"); }}
                  className="rounded-lg border border-white/10 px-3 py-2 text-xs text-gray-400 hover:text-white hover:bg-white/5"
                >
                  Mitad (-50%)
                </button>
              </div>
            </div>
            {mensajeAjuste && (
              <p className={`mt-3 text-xs ${mensajeAjuste.includes("Error") ? "text-red-400" : "text-[#39FF14]"}`}>
                {mensajeAjuste}
              </p>
            )}
          </div>

          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
            <h3 className="text-sm font-bold text-white mb-2">Atajos rápidos</h3>
            <div className="flex flex-wrap gap-2">
              {[-50, -30, -20, -10, 10, 20, 30, 50].map((pct) => (
                <button
                  key={pct}
                  onClick={() => ajustarPrecios(pct)}
                  disabled={ajustandoPrecios}
                  className="rounded-lg border border-white/10 px-3 py-1.5 text-xs text-gray-400 hover:text-white hover:bg-white/5 disabled:opacity-40"
                >
                  {pct > 0 ? "+" : ""}{pct}%
                </button>
              ))}
            </div>
          </div>

          {/* ── EDITAR PRECIO POR SKU ── */}
          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Tag className="h-4 w-4 text-[#FF5722]" /> Editar producto por SKU
            </h3>

            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  value={skuBuscar}
                  onChange={(e) => setSkuBuscar(e.target.value.toUpperCase())}
                  onKeyDown={(e) => e.key === "Enter" && buscarProductoSku()}
                  placeholder="Ej: AK-123, CARDAN-456"
                  className="w-full pl-9 pr-3 py-2 rounded-lg border border-white/10 bg-white/5 text-sm text-white outline-none focus:border-[#FF5722] uppercase"
                />
              </div>
              <button
                onClick={buscarProductoSku}
                disabled={loadingProducto || !skuBuscar.trim()}
                className="px-4 py-2 rounded-lg bg-[#FF5722] text-sm font-bold text-white hover:bg-[#FF5722]/80 disabled:opacity-40"
              >
                {loadingProducto ? <Loader2 className="w-4 h-4 animate-spin" /> : "Buscar"}
              </button>
            </div>

            {mensajeProducto && (
              <p className={`text-xs ${mensajeProducto.includes("Error") || mensajeProducto.includes("No encontrado") ? "text-red-400" : "text-[#39FF14]"}`}>
                {mensajeProducto}
              </p>
            )}

            {productoEdit && (
              <div className="space-y-4">
                {/* Card producto */}
                <div className="flex gap-3 p-3 rounded-lg bg-white/5 border border-white/5">
                  <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 bg-slate-800 flex items-center justify-center">
                    {productoEdit.image_url ? (
                      <img src={productoEdit.image_url} alt={productoEdit.name} className="w-full h-full object-contain" />
                    ) : (
                      <ImageOff className="w-6 h-6 text-gray-600" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] font-black px-2 py-0.5 rounded bg-slate-800 text-gray-300">{productoEdit.sku}</span>
                      {productoEdit.on_sale && (
                        <span className="text-[10px] font-black px-2 py-0.5 rounded bg-red-900/30 text-red-400">
                          <Zap className="w-3 h-3 inline mr-0.5" />EN OFERTA -{productoEdit.discount_pct}%
                        </span>
                      )}
                    </div>
                    <p className="text-sm font-bold text-white line-clamp-1">{productoEdit.name}</p>
                    <div className="mt-1 flex items-baseline gap-2">
                      {productoEdit.on_sale && productoEdit.discount_price ? (
                        <>
                          <span className="text-base font-black text-[#39FF14]">{fmtMoney(productoEdit.discount_price)}</span>
                          <span className="text-xs text-gray-500 line-through">{fmtMoney(productoEdit.catalog_price)}</span>
                        </>
                      ) : (
                        <span className="text-base font-black text-[#39FF14]">{fmtMoney(productoEdit.catalog_price)}</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Precio normal */}
                <div>
                  <label className="text-xs font-bold text-gray-400 mb-1.5 block">Precio normal</label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#39FF14]" />
                    <input
                      type="number"
                      min={0}
                      value={precioNormalEdit}
                      onChange={(e) => {
                        setPrecioNormalEdit(e.target.value);
                        if (enOfertaEdit && pctDescuentoEdit) {
                          const p = Number(e.target.value);
                          const pct = Number(pctDescuentoEdit);
                          if (p > 0 && pct > 0) setPrecioOfertaEdit(String(Math.round(p * (1 - pct / 100))));
                        }
                      }}
                      className="w-full pl-9 pr-3 py-2 rounded-lg border border-white/10 bg-white/5 text-sm text-white outline-none focus:border-[#FF5722]"
                    />
                  </div>
                </div>

                {/* Toggle oferta */}
                <div className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/5">
                  <div className="flex items-center gap-2">
                    <Tag className="w-4 h-4" style={{ color: enOfertaEdit ? "#ef4444" : "#6B7280" }} />
                    <div>
                      <p className="text-xs font-bold text-white">Poner en oferta</p>
                      <p className="text-[10px] text-gray-500">Muestra precio tachado + descuento en catálogo</p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      const next = !enOfertaEdit;
                      setEnOfertaEdit(next);
                      if (!next) { setPrecioOfertaEdit(""); setPctDescuentoEdit(""); }
                      else if (precioNormalEdit && !precioOfertaEdit) {
                        setPctDescuentoEdit("10");
                        setPrecioOfertaEdit(String(Math.round(Number(precioNormalEdit) * 0.9)));
                      }
                    }}
                    className="w-12 h-6 rounded-full relative transition-all flex-shrink-0"
                    style={{ background: enOfertaEdit ? "#ef4444" : "#374151" }}
                  >
                    <span className="absolute top-0.5 w-5 h-5 rounded-full transition-all bg-white"
                      style={{ left: enOfertaEdit ? "calc(100% - 22px)" : "2px" }} />
                  </button>
                </div>

                {enOfertaEdit && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-bold text-gray-400 mb-1.5 block flex items-center gap-1">
                        <Percent className="w-3 h-3" /> % Descuento
                      </label>
                      <input
                        type="number" min={1} max={99}
                        value={pctDescuentoEdit}
                        onChange={(e) => {
                          setPctDescuentoEdit(e.target.value);
                          const precio = Number(precioNormalEdit);
                          const pct = Number(e.target.value);
                          if (precio > 0 && pct > 0 && pct <= 100) {
                            setPrecioOfertaEdit(String(Math.round(precio * (1 - pct / 100))));
                          }
                        }}
                        className="w-full px-3 py-2 rounded-lg border border-red-900/30 bg-white/5 text-sm text-white outline-none focus:border-[#FF5722]"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-gray-400 mb-1.5 block flex items-center gap-1">
                        <Slash className="w-3 h-3" /> Precio oferta
                      </label>
                      <div className="relative">
                        <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-red-400" />
                        <input
                          type="number" min={0}
                          value={precioOfertaEdit}
                          onChange={(e) => {
                            setPrecioOfertaEdit(e.target.value);
                            const precio = Number(precioNormalEdit);
                            const oferta = Number(e.target.value);
                            if (precio > 0 && oferta > 0 && oferta < precio) {
                              setPctDescuentoEdit(String(Math.round(((precio - oferta) / precio) * 100)));
                            }
                          }}
                          className="w-full pl-9 pr-3 py-2 rounded-lg border border-red-900/30 bg-white/5 text-sm text-white outline-none focus:border-[#FF5722]"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {enOfertaEdit && Number(precioNormalEdit) > 0 && Number(precioOfertaEdit) > 0 && (
                  <div className="rounded-lg p-3 flex items-center justify-between bg-red-900/10 border border-red-900/20">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-500 line-through">{fmtMoney(Number(precioNormalEdit))}</span>
                      <span className="text-base font-black text-[#39FF14]">{fmtMoney(Number(precioOfertaEdit))}</span>
                    </div>
                    <span className="text-xs font-black px-2 py-0.5 rounded bg-red-900/20 text-red-400">-{pctDescuentoEdit}%</span>
                  </div>
                )}

                <button
                  onClick={guardarProductoSku}
                  disabled={guardandoProducto}
                  className="w-full py-3 rounded-lg bg-[#39FF14] text-sm font-black text-[#121212] hover:bg-[#39FF14]/80 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {guardandoProducto ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                  {guardandoProducto ? "Guardando..." : "Guardar cambios"}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* === FINANZAS === */}
      {vistaActiva === "finanzas" && (
        <div className="space-y-6">
          {/* KPIs financieros */}
          {stats && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="rounded-xl p-5 border border-gray-800 shadow-lg" style={{ backgroundColor: "#111827" }}>
                <p className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-1">Ventas Totales</p>
                <h3 className="text-2xl font-bold text-white">{fmtMoney(stats.ventasTotales)}</h3>
                <p className="text-xs text-gray-500 mt-1">Mes: {fmtMoney(stats.ventasMes)}</p>
              </div>
              <div className="rounded-xl p-5 border border-gray-800 shadow-lg" style={{ backgroundColor: "#111827" }}>
                <p className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-1">Comisiones Vendedores</p>
                <h3 className="text-2xl font-bold text-orange-400">{fmtMoney(stats.comisionesPendientes)}</h3>
                <p className="text-xs text-gray-500 mt-1">Pendientes de pago</p>
              </div>
              <div className="rounded-xl p-5 border border-gray-800 shadow-lg" style={{ backgroundColor: "#111827" }}>
                <p className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-1">Comisiones Pagadas</p>
                <h3 className="text-2xl font-bold text-green-400">{fmtMoney(stats.comisionesPagadas)}</h3>
                <p className="text-xs text-gray-500 mt-1">Liquidadas</p>
              </div>
              <div className="rounded-xl p-5 border border-gray-800 shadow-lg" style={{ backgroundColor: "#111827" }}>
                <p className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-1">Total Pedidos</p>
                <h3 className="text-2xl font-bold text-white">{stats.totalPedidos}</h3>
                <p className="text-xs text-gray-500 mt-1">Vendedores: {stats.totalVendedores}</p>
              </div>
            </div>
          )}

          {/* Panel de Gerentes - Comisión 10% sobre ventas de sus vendedores */}
          <div className="rounded-xl border border-gray-800 shadow-lg overflow-hidden" style={{ backgroundColor: "#111827" }}>
            <div className="p-5 border-b border-gray-800">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                👑 Comisiones de Gerentes
                <span className="text-xs font-normal text-gray-500 ml-1">— 10% sobre comisiones de sus vendedores asignados</span>
              </h3>
            </div>
            {vendedores.filter(v => v.es_gerente).length === 0 ? (
              <div className="p-8 text-center text-gray-600 text-sm">
                No hay gerentes asignados aún.{" "}
                <button onClick={() => setVistaActiva("vendedores" as any)} className="text-orange-500 hover:text-white underline">
                  Ir a Vendedores para asignar
                </button>
              </div>
            ) : (
              <div className="divide-y divide-gray-800">
                {vendedores.filter(v => v.es_gerente).map(gerente => {
                  const subordinados = vendedores.filter(s => s.lider_id === gerente.id);
                  const comisionGerenteTotal = subordinados.reduce((sum, s) => {
                    const comisionSub = pedidos
                      .filter(p => p.vendedor_id === s.id && p.estado !== "cancelado")
                      .reduce((ps, p) => ps + (p.comision_monto || 0), 0);
                    return sum + comisionSub * 0.10;
                  }, 0);
                  const ventasSubTotal = subordinados.reduce((sum, s) => {
                    return sum + pedidos
                      .filter(p => p.vendedor_id === s.id && p.estado !== "cancelado")
                      .reduce((ps, p) => ps + (p.total || 0), 0);
                  }, 0);
                  return (
                    <div key={gerente.id} className="p-5">
                      {/* Cabecera gerente */}
                      <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-purple-900/50 border border-purple-500/30 flex items-center justify-center font-bold text-purple-300 text-sm flex-shrink-0">
                            {gerente.nombre.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-white font-semibold">{gerente.nombre}</span>
                              <span className="text-[10px] rounded-full border border-purple-500/30 bg-purple-500/10 px-2 py-0.5 text-purple-300">👑 Gerente</span>
                            </div>
                            <p className="text-xs text-gray-500">{gerente.email} · Ref: {gerente.codigo_referido}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-gray-500 uppercase tracking-wider">Comisión gerente (10%)</p>
                          <p className="text-xl font-bold text-purple-400">{fmtMoney(comisionGerenteTotal)}</p>
                          <p className="text-xs text-gray-500">sobre {fmtMoney(ventasSubTotal)} en ventas de su equipo</p>
                        </div>
                      </div>
                      {/* Vendedores subordinados */}
                      {subordinados.length === 0 ? (
                        <p className="text-xs text-gray-600 pl-2">Sin vendedores asignados aún.</p>
                      ) : (
                        <div className="rounded-lg border border-gray-800 overflow-hidden" style={{ backgroundColor: "#080c16" }}>
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="border-b border-gray-800">
                                <th className="text-left py-2 px-4 text-xs text-gray-500 font-semibold">Vendedor</th>
                                <th className="text-right py-2 px-4 text-xs text-gray-500 font-semibold">Ventas</th>
                                <th className="text-right py-2 px-4 text-xs text-gray-500 font-semibold">Comisión (base+3%)</th>
                                <th className="text-right py-2 px-4 text-xs text-gray-500 font-semibold">10% al gerente</th>
                              </tr>
                            </thead>
                            <tbody>
                              {subordinados.map(sub => {
                                const ventasSub = pedidos
                                  .filter(p => p.vendedor_id === sub.id && p.estado !== "cancelado")
                                  .reduce((s, p) => s + (p.total || 0), 0);
                                const comisionSub = pedidos
                                  .filter(p => p.vendedor_id === sub.id && p.estado !== "cancelado")
                                  .reduce((s, p) => s + (p.comision_monto || 0), 0);
                                const parteGerente = comisionSub * 0.10;
                                return (
                                  <tr key={sub.id} className="border-b border-gray-800/50 hover:bg-gray-800/20 transition">
                                    <td className="py-3 px-4">
                                      <div className="flex items-center gap-2">
                                        <div className="w-6 h-6 rounded-full bg-gray-700 flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0">
                                          {sub.nombre.charAt(0).toUpperCase()}
                                        </div>
                                        <div>
                                          <p className="text-white text-xs font-medium">{sub.nombre}</p>
                                          <p className="text-[10px] text-gray-500">{sub.comision_pct}%+3% com.</p>
                                        </div>
                                      </div>
                                    </td>
                                    <td className="py-3 px-4 text-right text-green-400 text-xs font-medium">{fmtMoney(ventasSub)}</td>
                                    <td className="py-3 px-4 text-right text-orange-400 text-xs font-medium">{fmtMoney(comisionSub)}</td>
                                    <td className="py-3 px-4 text-right text-purple-400 text-xs font-bold">{fmtMoney(parteGerente)}</td>
                                  </tr>
                                );
                              })}
                              <tr className="bg-gray-800/20">
                                <td colSpan={2} className="py-2 px-4 text-xs text-gray-500">Total equipo</td>
                                <td className="py-2 px-4 text-right text-xs text-orange-300 font-semibold">
                                  {fmtMoney(subordinados.reduce((s, sub) => s + pedidos.filter(p => p.vendedor_id === sub.id && p.estado !== "cancelado").reduce((ps, p) => ps + (p.comision_monto || 0), 0), 0))}
                                </td>
                                <td className="py-2 px-4 text-right text-xs text-purple-300 font-bold">{fmtMoney(comisionGerenteTotal)}</td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Tabla de comisiones individuales de vendedores */}
          <div className="rounded-xl border border-gray-800 shadow-lg overflow-hidden" style={{ backgroundColor: "#111827" }}>
            <div className="p-5 border-b border-gray-800">
              <h3 className="text-base font-bold text-white">Comisiones por Vendedor</h3>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800">
                  <th className="text-left py-3 px-4 text-xs text-gray-500 font-semibold">Vendedor</th>
                  <th className="text-right py-3 px-4 text-xs text-gray-500 font-semibold">Ventas totales</th>
                  <th className="text-right py-3 px-4 text-xs text-gray-500 font-semibold">Comisión pendiente</th>
                  <th className="text-right py-3 px-4 text-xs text-gray-500 font-semibold">Comisión pagada</th>
                  <th className="text-right py-3 px-4 text-xs text-gray-500 font-semibold">Gerente</th>
                </tr>
              </thead>
              <tbody>
                {[...vendedores]
                  .sort((a, b) => (b.total_vendido || 0) - (a.total_vendido || 0))
                  .map(v => {
                    const comPend = pedidos.filter(p => p.vendedor_id === v.id && p.comision_estado === "pendiente").reduce((s, p) => s + (p.comision_monto || 0), 0);
                    const comPag = pedidos.filter(p => p.vendedor_id === v.id && p.comision_estado === "pagada").reduce((s, p) => s + (p.comision_monto || 0), 0);
                    const gerenteV = vendedores.find(g => g.id === v.lider_id);
                    return (
                      <tr key={v.id} className="border-b border-gray-800/50 hover:bg-gray-800/20 transition">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-gray-700 flex items-center justify-center font-bold text-white text-xs flex-shrink-0">{v.nombre.charAt(0).toUpperCase()}</div>
                            <div>
                              <p className="text-white font-medium">{v.nombre} {v.es_gerente && "👑"}</p>
                              <p className="text-[10px] text-gray-500">{v.comision_pct}%{v.lider_id ? "+3%" : ""}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-right text-green-400 font-medium">{fmtMoney(v.total_vendido)}</td>
                        <td className="py-3 px-4 text-right text-orange-400">{fmtMoney(comPend)}</td>
                        <td className="py-3 px-4 text-right text-green-400">{fmtMoney(comPag)}</td>
                        <td className="py-3 px-4 text-right text-xs text-purple-300">{gerenteV ? gerenteV.nombre : <span className="text-gray-600">—</span>}</td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
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
                    const now = new Date().toISOString();
                    const update: any = { estado: e, updated_at: now };
                    if (e === "confirmado") update.fecha_confirmado = now;
                    else if (e === "pagado") update.fecha_pagado = now;
                    else if (e === "enviado") update.fecha_enviado = now;
                    else if (e === "entregado") update.fecha_entregado = now;
                    else if (e === "cancelado") update.fecha_cancelado = now;
                    setSelected({ ...selected, ...update });
                    actualizarEstado(selected.id, e);
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

            {/* Timeline de estados */}
            <section className="mt-4">
              <h3 className="flex items-center gap-2 text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                <Timer className="h-3 w-3" /> Historial de estados
              </h3>
              <div className="rounded-lg bg-white/[0.03] border border-white/5 p-3">
                <div className="space-y-2">
                  {[
                    { label: "Creado", fecha: selected.created_at, color: "text-gray-400" },
                    { label: "Confirmado", fecha: selected.fecha_confirmado, color: "text-blue-400" },
                    { label: "Pagado", fecha: selected.fecha_pagado, color: "text-[#39FF14]" },
                    { label: "Enviado", fecha: selected.fecha_enviado, color: "text-purple-400" },
                    { label: "Entregado", fecha: selected.fecha_entregado, color: "text-[#39FF14]" },
                    { label: "Cancelado", fecha: selected.fecha_cancelado, color: "text-red-400" },
                  ]
                    .filter((s) => s.fecha)
                    .map((s, i, arr) => (
                      <div key={s.label} className="flex items-center gap-3">
                        <div className="flex flex-col items-center">
                          <div className={`w-2 h-2 rounded-full ${s.color.replace("text-", "bg-")}`} />
                          {i < arr.length - 1 && (
                            <div className="w-px h-4 bg-white/10" />
                          )}
                        </div>
                        <div className="flex-1 flex items-center justify-between">
                          <span className={`text-xs font-medium ${s.color}`}>{s.label}</span>
                          <span className="text-[10px] text-gray-500 font-mono">{fmtFechaHora(s.fecha)}</span>
                        </div>
                      </div>
                    ))}
                  {selected.updated_at && selected.updated_at !== selected.created_at && (
                    <div className="pt-1 border-t border-white/5 mt-1">
                      <span className="text-[10px] text-gray-600">
                        Última actualización: {fmtFechaHora(selected.updated_at)}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </section>

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
              <div className="rounded-lg bg-white/5 p-3 text-sm space-y-2">
                <p><span className="text-gray-500">Forma:</span> <span className={selected.datos_cliente?.formaPago === "Transferencia" ? "text-blue-400 font-bold" : ""}>{selected.datos_cliente?.formaPago || "-"}</span></p>
                {selected.datos_cliente?.comprobante && (() => {
                  const comp = selected.datos_cliente.comprobante;
                  const isUrl = comp.startsWith("http");
                  const isImg = /\.(jpg|jpeg|png|webp|gif)$/i.test(comp);
                  return (
                    <div className="space-y-2">
                      <p className="text-gray-500 text-xs font-semibold uppercase">Comprobante</p>
                      {isUrl && isImg ? (
                        <a href={comp} target="_blank" rel="noopener noreferrer">
                          <img src={comp} alt="Comprobante" className="max-w-full max-h-48 rounded-lg border border-white/10 object-contain hover:opacity-90 transition-opacity" />
                        </a>
                      ) : isUrl ? (
                        <a href={comp} target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-2 rounded-lg border border-[#39FF14]/30 bg-[#39FF14]/5 px-3 py-2 text-[#39FF14] hover:bg-[#39FF14]/10 transition-colors">
                          <span className="text-xs font-bold">📎 Ver comprobante</span>
                        </a>
                      ) : (
                        <span className="text-[#39FF14] text-xs">{comp}</span>
                      )}
                      {isUrl && (
                        <p className="text-[10px] text-gray-600">
                          {selected.datos_cliente?.formaPago === "Transferencia"
                            ? "⚠️ Verificar transferencia antes de confirmar el pedido"
                            : ""}
                        </p>
                      )}
                    </div>
                  );
                })()}
                {!selected.datos_cliente?.comprobante && selected.datos_cliente?.formaPago === "Transferencia" && (
                  <p className="text-xs text-yellow-400 font-medium">⚠️ Sin comprobante adjunto</p>
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
        </div>
      </main>
    </div>
  );
}

function StatCard({ label, value, color = "white", icon }: { label: string; value: string; color?: string; icon?: ReactNode }) {
  const colorMap: Record<string, string> = {
    white: "border-white/10 bg-white/[0.03] text-white",
    yellow: "border-yellow-500/30 bg-yellow-500/5 text-yellow-400",
    green: "border-[#39FF14]/30 bg-[#39FF14]/5 text-[#39FF14]",
    orange: "border-[#FF5722]/30 bg-[#FF5722]/5 text-[#FF5722]",
    blue: "border-blue-500/30 bg-blue-500/5 text-blue-400",
    purple: "border-purple-500/30 bg-purple-500/5 text-purple-400",
    cyan: "border-cyan-500/30 bg-cyan-500/5 text-cyan-400",
    emerald: "border-emerald-500/30 bg-emerald-500/5 text-emerald-400",
  };
  return (
    <div className={`rounded-xl border p-3 ${colorMap[color] || colorMap.white}`}>
      <div className="flex items-center justify-between">
        <p className="text-xs text-gray-400">{label}</p>
        {icon ? <span>{icon}</span> : null}
      </div>
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

