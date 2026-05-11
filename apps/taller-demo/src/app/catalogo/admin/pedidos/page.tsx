"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
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
}

function fmtMoney(n: number) {
  return "$" + (n || 0).toLocaleString("es-AR", { maximumFractionDigits: 0 });
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

export default function AdminPedidosPage() {
  const router = useRouter();
  const { admin, logout, loading: authLoading, getToken } = useAdminAuth();
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Pedido | null>(null);
  const [filtro, setFiltro] = useState("todas");
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [vendedores, setVendedores] = useState<VendedorData[]>([]);
  const [clientes, setClientes] = useState<ClienteData[]>([]);
  const [vistaActiva, setVistaActiva] = useState<"pedidos" | "vendedores" | "clientes" | "dashboard" | "precios" | "finanzas">("dashboard");
  const [precioStats, setPrecioStats] = useState<{ total: number; activos: number; precioMin: number; precioMax: number; precioPromedio: number } | null>(null);
  const [porcentajeAjuste, setPorcentajeAjuste] = useState("");
  const [ajustandoPrecios, setAjustandoPrecios] = useState(false);
  const [mensajeAjuste, setMensajeAjuste] = useState("");
  const [evolucion, setEvolucion] = useState<EvolucionData | null>(null);
  const [pedidosPorEstado, setPedidosPorEstado] = useState<Record<string, number>>({});
  const [loadingDashboard, setLoadingDashboard] = useState(true);
  const [dashboardError, setDashboardError] = useState<string | null>(null);
  const [guardandoGerente, setGuardandoGerente] = useState<string | null>(null);
  const [asignandoGerenteId, setAsignandoGerenteId] = useState<Record<string, string>>({});

  useEffect(() => {
    if (authLoading) return;
    if (!admin) {
      router.push("/catalogo/admin/login");
      return;
    }
    cargarPedidos();
    cargarDashboard();
  }, [admin, authLoading, router]);

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
        setVendedores(data.vendedores || data.topVendedores || []);
        setClientes(data.clientes || data.clientesRecientes || []);
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
        await cargarDashboard();
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

      {/* Navegación por pestañas */}
      <div className="mt-4 flex flex-wrap gap-2 border-b border-white/10 pb-3">
        {[
          { id: "dashboard", label: "Dashboard", icon: BarChart3 },
          { id: "pedidos", label: "Pedidos", icon: Package },
          { id: "vendedores", label: "Vendedores", icon: Store },
          { id: "clientes", label: "Clientes", icon: Users },
          { id: "precios", label: "Precios", icon: Percent },
          { id: "finanzas", label: "Finanzas", icon: Wallet },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setVistaActiva(tab.id as any)}
            className={`flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium ${
              vistaActiva === tab.id
                ? "bg-[#FF5722]/20 text-[#FF5722] border border-[#FF5722]/30"
                : "text-gray-400 hover:text-white hover:bg-white/5 border border-transparent"
            }`}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* === DASHBOARD === */}
      {vistaActiva === "dashboard" && loadingDashboard && (
        <div className="mt-16 flex flex-col items-center gap-3 text-gray-400">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#FF5722] border-t-transparent" />
          <span className="text-sm">Cargando dashboard...</span>
        </div>
      )}
      {vistaActiva === "dashboard" && !loadingDashboard && dashboardError && (
        <div className="mt-8 rounded-xl border border-red-500/30 bg-red-500/10 p-6 text-center">
          <p className="text-red-400 font-semibold mb-1">Error al cargar estadísticas</p>
          <p className="text-xs text-gray-400">{dashboardError}</p>
          <button onClick={cargarDashboard} className="mt-3 rounded-lg border border-white/10 px-4 py-2 text-sm text-gray-300 hover:bg-white/5">Reintentar</button>
        </div>
      )}
      {vistaActiva === "dashboard" && !loadingDashboard && !dashboardError && stats && (
        <div className="mt-4 space-y-4">
          {/* KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="rounded-xl p-5 border border-white/10 bg-white/[0.03] shadow-lg">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <p className="text-gray-400 text-xs font-semibold uppercase tracking-wider">Ventas Totales (Mes)</p>
                  <h3 className="text-2xl font-bold text-white mt-1">{fmtMoney(stats.ventasMes)}</h3>
                </div>
                <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center text-green-500"><TrendingUp className="h-5 w-5" /></div>
              </div>
              <p className="text-xs text-green-400 flex items-center gap-1"><TrendingUp className="h-3 w-3" /> {stats.ventasSemana > 0 ? "Semana activa" : "Sin movimientos"}</p>
            </div>
            <div className="rounded-xl p-5 border border-white/10 bg-white/[0.03] shadow-lg">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <p className="text-gray-400 text-xs font-semibold uppercase tracking-wider">Comisiones MADSJEEZ</p>
                  <h3 className="text-2xl font-bold text-white mt-1">{fmtMoney(stats.comisionesPendientes + stats.comisionesPagadas)}</h3>
                </div>
                <div className="w-10 h-10 rounded-lg bg-[#FF5722]/10 flex items-center justify-center text-[#FF5722]"><DollarSign className="h-5 w-5" /></div>
              </div>
              <p className="text-xs text-green-400 flex items-center gap-1"><TrendingUp className="h-3 w-3" /> Pendientes: {fmtMoney(stats.comisionesPendientes)}</p>
            </div>
            <div className="rounded-xl p-5 border border-white/10 bg-white/[0.03] shadow-lg">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <p className="text-gray-400 text-xs font-semibold uppercase tracking-wider">Pedidos en Curso</p>
                  <h3 className="text-2xl font-bold text-white mt-1">{pedidos.filter(p => !["entregado", "cancelado"].includes(p.estado)).length}</h3>
                </div>
                <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-500"><Truck className="h-5 w-5" /></div>
              </div>
              <p className="text-xs text-gray-500 flex items-center gap-1">{pedidos.filter(p => p.estado === "enviado").length} despachados</p>
            </div>
            <div className="rounded-xl p-5 border border-red-500/30 bg-white/[0.03] shadow-[0_0_15px_rgba(220,38,38,0.1)]">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <p className="text-gray-400 text-xs font-semibold uppercase tracking-wider">Cancelados / Reclamos</p>
                  <h3 className="text-2xl font-bold text-red-400 mt-1">{pedidos.filter(p => p.estado === "cancelado").length}</h3>
                </div>
                <div className="w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center text-red-400"><X className="h-5 w-5" /></div>
              </div>
              <p className="text-xs text-red-400 flex items-center gap-1"><Clock className="h-3 w-3" /> Requieren atención</p>
            </div>
          </div>

          {/* Gráficos */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
            <div className="lg:col-span-2 rounded-xl p-5 border border-white/10 bg-white/[0.03] shadow-lg">
              <h3 className="text-lg font-bold text-white mb-4">Evolución de Ventas y Comisiones</h3>
              <div className="relative h-64 w-full">
                {evolucion ? (
                  <Line
                    data={{
                      labels: evolucion.labels,
                      datasets: [
                        {
                          label: "Ventas ($)",
                          data: evolucion.ventas,
                          borderColor: "#10b981",
                          backgroundColor: "rgba(16, 185, 129, 0.1)",
                          borderWidth: 2,
                          tension: 0.4,
                          fill: true,
                          pointRadius: 3,
                        },
                        {
                          label: "Comisiones ($)",
                          data: evolucion.comisiones,
                          borderColor: "#FF5722",
                          backgroundColor: "rgba(255, 87, 34, 0.1)",
                          borderWidth: 2,
                          tension: 0.4,
                          fill: true,
                          pointRadius: 3,
                        },
                      ],
                    }}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: { position: "top", labels: { color: "#9ca3af" } },
                      },
                      scales: {
                        y: { beginAtZero: true, grid: { color: "#1f2937" }, ticks: { color: "#9ca3af" } },
                        x: { grid: { color: "#1f2937" }, ticks: { color: "#9ca3af" } },
                      },
                    }}
                  />
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-500 text-sm">Sin datos de evolución</div>
                )}
              </div>
            </div>
            <div className="rounded-xl p-5 border border-white/10 bg-white/[0.03] shadow-lg">
              <h3 className="text-lg font-bold text-white mb-4">Estado de Despachos</h3>
              <div className="relative h-56 w-full flex justify-center">
                {Object.keys(pedidosPorEstado).length > 0 ? (
                  <Doughnut
                    data={{
                      labels: ["Pendiente", "Confirmado", "Pagado", "Enviado", "Entregado", "Cancelado"],
                      datasets: [
                        {
                          data: [
                            pedidosPorEstado.pendiente || 0,
                            pedidosPorEstado.confirmado || 0,
                            pedidosPorEstado.pagado || 0,
                            pedidosPorEstado.enviado || 0,
                            pedidosPorEstado.entregado || 0,
                            pedidosPorEstado.cancelado || 0,
                          ],
                          backgroundColor: ["#eab308", "#3b82f6", "#10b981", "#8b5cf6", "#10b981", "#ef4444"],
                          borderWidth: 0,
                          hoverOffset: 4,
                        },
                      ],
                    }}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      cutout: "70%",
                      plugins: {
                        legend: { display: false },
                      },
                    }}
                  />
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-500 text-sm">Sin datos</div>
                )}
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-yellow-500" /> Pendiente</div>
                <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-blue-500" /> Confirmado</div>
                <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-green-500" /> Pagado</div>
                <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-purple-500" /> Enviado</div>
                <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-emerald-500" /> Entregado</div>
                <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-red-500" /> Cancelado</div>
              </div>
            </div>
          </div>

          {/* Tablas de ranking y alertas */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
            {/* Top Vendedores */}
            <div className="rounded-xl border border-white/10 bg-white/[0.03] shadow-lg overflow-hidden">
              <div className="p-4 border-b border-white/10 flex justify-between items-center">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2"><Award className="h-4 w-4 text-yellow-500" /> Top Vendedores</h3>
                <button onClick={exportarVendedores} className="text-xs text-[#FF5722] hover:text-white transition">Ver todos</button>
              </div>
              <div className="p-0">
                {vendedores.slice(0, 5).map((v, i) => (
                  <div key={v.id} className="flex items-center justify-between border-b border-white/5 hover:bg-white/5 px-4 py-3 transition">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center font-bold text-white text-xs">{v.nombre.charAt(0).toUpperCase()}</div>
                      <div>
                        <p className="text-white font-medium text-sm">{v.nombre}</p>
                        <p className="text-xs text-gray-500">{v.total_vendido ? (v.total_vendido / 1000).toFixed(0) + "k" : "0"} ventas · {v.comision_pct}% com.</p>
                      </div>
                    </div>
                    <span className="text-green-400 font-medium text-sm">{fmtMoney(v.total_vendido)}</span>
                  </div>
                ))}
                {vendedores.length === 0 && (
                  <div className="px-4 py-8 text-center text-gray-400 text-sm">Sin vendedores</div>
                )}
              </div>
            </div>

            {/* Compradores VIP */}
            <div className="rounded-xl border border-white/10 bg-white/[0.03] shadow-lg overflow-hidden">
              <div className="p-4 border-b border-white/10 flex justify-between items-center">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2"><Star className="h-4 w-4 text-blue-400" /> Compradores VIP</h3>
                <button onClick={exportarClientes} className="text-xs text-[#FF5722] hover:text-white transition">Ver todos</button>
              </div>
              <div className="p-0">
                {clientes.slice(0, 5).map((c, i) => (
                  <div key={c.id} className="flex items-center justify-between border-b border-white/5 hover:bg-white/5 px-4 py-3 transition">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center font-bold text-white text-xs">{c.nombre ? c.nombre.charAt(0).toUpperCase() : "?"}</div>
                      <div>
                        <p className="text-white font-medium text-sm">{c.nombre || "Sin nombre"}</p>
                        <p className="text-xs text-gray-500">{c.email || "-"}</p>
                      </div>
                    </div>
                    <span className="text-gray-300 text-xs">{new Date(c.created_at).toLocaleDateString("es-AR")}</span>
                  </div>
                ))}
                {clientes.length === 0 && (
                  <div className="px-4 py-8 text-center text-gray-400 text-sm">Sin clientes</div>
                )}
              </div>
            </div>

            {/* Alertas de Pedidos */}
            <div className="rounded-xl border border-white/10 bg-white/[0.03] shadow-lg overflow-hidden">
              <div className="p-4 border-b border-white/10 bg-red-500/5">
                <h3 className="text-sm font-bold text-red-400 uppercase tracking-wider flex items-center gap-2"><AlertTriangle className="h-4 w-4" /> Alertas de Pedidos</h3>
              </div>
              <div className="p-4 space-y-3">
                {pedidos.filter(p => p.estado === "cancelado").slice(0, 3).map((p) => (
                  <div key={p.id} className="rounded-lg p-3 border border-white/10 bg-white/5">
                    <div className="flex justify-between items-start mb-1">
                      <span className="text-xs font-bold text-red-400">#{p.id.slice(0, 8).toUpperCase()}</span>
                      <span className="text-[10px] bg-red-500/20 text-red-400 px-2 py-0.5 rounded">Cancelado</span>
                    </div>
                    <p className="text-sm text-white mb-1">{p.items?.map(i => i.nombre).slice(0, 2).join(", ") || "Sin items"}{p.items && p.items.length > 2 ? "..." : ""}</p>
                    <div className="flex justify-between items-center text-xs text-gray-500">
                      <span>Total: {fmtMoney(p.total)}</span>
                      <button onClick={() => setSelected(p)} className="text-[#FF5722] hover:text-white">Ver detalle</button>
                    </div>
                  </div>
                ))}
                {pedidos.filter(p => p.estado === "cancelado").length === 0 && (
                  <div className="text-center text-gray-400 text-sm py-4">Sin pedidos cancelados</div>
                )}
              </div>
            </div>
          </div>

          {/* Resumen rápido */}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Total Vendedores" value={String(stats.totalVendedores)} icon={<Store className="h-5 w-5 text-blue-400" />} color="blue" />
            <StatCard label="Total Clientes" value={String(stats.totalClientes)} icon={<Users className="h-5 w-5 text-purple-400" />} color="purple" />
            <StatCard label="Carritos Abandonados" value={String(stats.totalCarritosAbandonados)} icon={<ShoppingCart className="h-5 w-5 text-orange-400" />} color="orange" />
            <StatCard label="Comisiones Pagadas" value={fmtMoney(stats.comisionesPagadas)} icon={<Check className="h-5 w-5 text-[#39FF14]" />} color="green" />
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

      {/* === CLIENTES === */}
      {vistaActiva === "clientes" && (
        <div className="mt-4 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Users className="h-5 w-5 text-[#FF5722]" />
              Clientes ({clientes.length})
            </h2>
            <button onClick={exportarClientes} className="flex items-center gap-1 rounded-lg border border-white/10 px-3 py-1.5 text-xs text-gray-400 hover:text-white hover:bg-white/5">
              <Download className="h-3.5 w-3.5" /> Exportar CSV
            </button>
          </div>
          {clientes.length === 0 ? (
            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-8 text-center text-gray-400">
              No hay clientes registrados.
            </div>
          ) : (
            <div className="space-y-2">
              {clientes.map((c) => (
                <div key={c.id} className="rounded-xl border border-white/10 bg-white/[0.03] p-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-white font-semibold">{c.nombre || "-"}</span>
                    <span className="text-xs text-gray-400">{new Date(c.created_at).toLocaleDateString("es-AR")}</span>
                  </div>
                  <div className="mt-1 flex items-center gap-3 text-xs text-gray-400">
                    <span>{c.email || "-"}</span>
                    <span>{c.telefono || "-"}</span>
                    <span>DNI: {c.dni || "-"}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

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
        </div>
      )}

      {/* === FINANZAS === */}
      {vistaActiva === "finanzas" && stats && (
        <div className="mt-4 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Ventas Totales" value={fmtMoney(stats.ventasTotales)} icon={<TrendingUp className="h-5 w-5 text-green-400" />} color="green" />
            <StatCard label="Ventas Mes" value={fmtMoney(stats.ventasMes)} icon={<Calendar className="h-5 w-5 text-cyan-400" />} color="cyan" />
            <StatCard label="Ventas Semana" value={fmtMoney(stats.ventasSemana)} icon={<Clock className="h-5 w-5 text-yellow-400" />} color="yellow" />
            <StatCard label="Carritos Abandonados" value={String(stats.totalCarritosAbandonados)} icon={<ShoppingCart className="h-5 w-5 text-orange-400" />} color="orange" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <StatCard label="Comisiones Pendientes" value={fmtMoney(stats.comisionesPendientes)} icon={<DollarSign className="h-5 w-5 text-[#FF5722]" />} color="orange" />
            <StatCard label="Comisiones Pagadas" value={fmtMoney(stats.comisionesPagadas)} icon={<Check className="h-5 w-5 text-[#39FF14]" />} color="green" />
          </div>
          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
            <h3 className="text-sm font-bold text-white mb-3">Resumen Financiero</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between border-b border-white/5 py-2">
                <span className="text-gray-400">Total Vendedores</span>
                <span className="text-white font-medium">{stats.totalVendedores}</span>
              </div>
              <div className="flex justify-between border-b border-white/5 py-2">
                <span className="text-gray-400">Total Clientes</span>
                <span className="text-white font-medium">{stats.totalClientes}</span>
              </div>
              <div className="flex justify-between border-b border-white/5 py-2">
                <span className="text-gray-400">Total Pedidos</span>
                <span className="text-white font-medium">{stats.totalPedidos}</span>
              </div>
              <div className="flex justify-between border-b border-white/5 py-2">
                <span className="text-gray-400">Productos Activos</span>
                <span className="text-white font-medium">{stats.totalProductos}</span>
              </div>
              <div className="flex justify-between border-b border-white/5 py-2">
                <span className="text-gray-400">Items en Carritos</span>
                <span className="text-white font-medium">{stats.totalItemsCarrito}</span>
              </div>
            </div>
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
