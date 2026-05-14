"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "@/components/catalogo/CartContext";
import { useClienteAuth } from "@/components/cliente/ClienteAuthContext";
import { generarMensajeWhatsApp, abrirWhatsApp } from "@/lib/pedidoWhatsApp";
import {
  ShoppingBag,
  Truck,
  CreditCard,
  User,
  MapPin,
  Phone,
  FileText,
  ArrowLeft,
  Send,
  Package,
  ChevronDown,
  Clock,
  AlertTriangle,
  Info,
  Store,
  Copy,
  CheckCircle,
  Upload,
  X,
  Banknote,
} from "lucide-react";

function fmtMoney(n: number) {
  return "$" + n.toLocaleString("es-AR", { maximumFractionDigits: 0 });
}

export default function CheckoutPage() {
  const router = useRouter();
  const { items, totals, clearCart } = useCart();
  const { cliente } = useClienteAuth();

  const [form, setForm] = useState({
    nombre: "",
    dni: "",
    email: "",
    direccion: "",
    entreCalles: "",
    localidad: "",
    provincia: "",
    codigoPostal: "",
    telefono: "",
    formaPago: "Efectivo",
    notas: "",
    comprobante: "" as string,
  });

  const [pedidosAnteriores, setPedidosAnteriores] = useState<any[]>([]);
  const [buscandoPedidos, setBuscandoPedidos] = useState(false);

  const [numeroCliente, setNumeroCliente] = useState<string | null>(null);
  const [enviado, setEnviado] = useState(false);
  const [demorasOpen, setDemorasOpen] = useState(false);
  const [comprobanteFile, setComprobanteFile] = useState<File | null>(null);
  const [uploadingComprobante, setUploadingComprobante] = useState(false);
  const [comprobanteUrl, setComprobanteUrl] = useState<string>("");
  const [showTransferenciaModal, setShowTransferenciaModal] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const DATOS_TRANSFERENCIA = {
    banco: "Banco Francés (BBVA)",
    tipoCuenta: "Caja de Ahorro en $",
    cbu: "0170142140000008408477",
    alias: "MAQJEEZ06",
    numeroCuenta: "142-84084/7",
    cuit: "20-31264840-8",
    sucursal: "Rafael Ramos Mejia 173",
  };

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    });
  };

  const uploadComprobante = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append("file", file);
    try {
      const res = await fetch("/api/comprobante/upload", { method: "POST", body: formData });
      const data = await res.json();
      return data.url || file.name;
    } catch {
      return file.name;
    }
  };

  // Estado de entregas: 'normal' | 'demora'
  const estadoEntregas = "normal"; // Cambiar a "demora" cuando haya alta demanda

  // Obtener número de cliente del localStorage al cargar
  useEffect(() => {
    const stored = localStorage.getItem("cliente_numero");
    if (stored) setNumeroCliente(stored);
  }, []);

  // Prellenar datos del cliente logueado
  useEffect(() => {
    if (cliente) {
      setForm((prev) => ({
        ...prev,
        nombre: cliente.nombre || prev.nombre,
        email: cliente.email || prev.email,
      }));
    }
  }, [cliente]);

  // Buscar pedidos anteriores cuando cambian DNI, email o teléfono
  useEffect(() => {
    const dni = form.dni.trim();
    const email = form.email.trim();
    const telefono = form.telefono.trim();

    if (!dni && !email && !telefono) {
      setPedidosAnteriores([]);
      return;
    }

    const timeout = setTimeout(async () => {
      setBuscandoPedidos(true);
      try {
        const params = new URLSearchParams();
        if (dni) params.append("dni", dni);
        if (email) params.append("email", email);
        if (telefono) params.append("telefono", telefono);
        const res = await fetch(`/api/pedidos/catalogo/buscar?${params.toString()}`);
        const data = await res.json();
        setPedidosAnteriores(data.pedidos || []);
      } catch (e) {
        console.error("Error buscando pedidos:", e);
      } finally {
        setBuscandoPedidos(false);
      }
    }, 600);

    return () => clearTimeout(timeout);
  }, [form.dni, form.email, form.telefono]);

  if (items.length === 0 && !enviado) {
    return (
      <main className="mx-auto max-w-lg px-4 py-16 text-center">
        <Package className="mx-auto h-12 w-12 text-gray-600" />
        <h1 className="mt-4 text-xl font-bold text-white">Carrito vacío</h1>
        <p className="mt-2 text-gray-400">Agregá productos antes de finalizar el pedido.</p>
        <button
          onClick={() => router.push("/catalogo")}
          className="mt-6 rounded-xl bg-[#FF5722] px-6 py-3 font-bold text-white hover:bg-[#E64A19]"
        >
          Ir al catálogo
        </button>
      </main>
    );
  }

  if (enviado) {
    return (
      <main className="mx-auto max-w-lg px-4 py-16 text-center">
        <div className="rounded-2xl border border-[#39FF14]/30 bg-[#39FF14]/5 p-8">
          <Send className="mx-auto h-12 w-12 text-[#39FF14]" />
          <h1 className="mt-4 text-2xl font-black text-white">¡Pedido enviado!</h1>
          <p className="mt-2 text-gray-300">
            Se abrió WhatsApp con tu pedido. Si no se abrió, revisá que no esté bloqueado.
          </p>
          <p className="mt-4 text-sm text-gray-400">
            También te guardamos el pedido en tu historial.
          </p>
          <button
            onClick={() => router.push("/catalogo")}
            className="mt-6 rounded-xl bg-[#FF5722] px-6 py-3 font-bold text-white hover:bg-[#E64A19]"
          >
            Volver al catálogo
          </button>
        </div>
      </main>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Si el pago es transferencia y no mostró el modal de datos aún, mostrarlo
    if (form.formaPago === "Transferencia" && !showTransferenciaModal && !comprobanteFile) {
      setShowTransferenciaModal(true);
      return;
    }

    // Si hay comprobante, subirlo primero
    let uploadedUrl = comprobanteUrl;
    if (comprobanteFile && !comprobanteUrl) {
      setUploadingComprobante(true);
      uploadedUrl = await uploadComprobante(comprobanteFile);
      setComprobanteUrl(uploadedUrl);
      update("comprobante", uploadedUrl);
      setUploadingComprobante(false);
    }

    // Obtener vendedor referido: primero localStorage, si no hay usar el del cliente logueado
    const vendedorIdLS = localStorage.getItem("ref_vendedor_id");
    const vendedorIdCliente = cliente?.vendedor_referente_id || null;
    const vendedorId = vendedorIdLS || vendedorIdCliente;
    let comisionMonto = 0;
    let comisionPct = 0;

    // Si hay vendedor, calcular comisión según su nivel
    if (vendedorId) {
      try {
        const refCodigo = localStorage.getItem("ref_codigo");
        const url = refCodigo
          ? `/api/vendedor/public?codigo=${encodeURIComponent(refCodigo)}`
          : `/api/vendedor/public?id=${encodeURIComponent(vendedorId)}`;
        const res = await fetch(url);
        const data = await res.json();
        if (data.vendedor) {
          const nivel = data.vendedor.nivel_vendedor || "nuevo";
          const pctMap: Record<string, number> = {
            nuevo: 10,
            junior: 11,
            senior: 12,
            senior_pro: 12,
            master: 15,
            gerente: 15,
          };
          comisionPct = pctMap[nivel] || 10;
          comisionMonto = Math.round((totals.subtotal * comisionPct) / 100);
        }
      } catch {
        comisionMonto = Math.round((totals.subtotal * 10) / 100);
      }
    }

    // Guardar pedido en DB
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      const clienteToken = localStorage.getItem("cliente_token");
      if (clienteToken) headers["x-cliente-token"] = clienteToken;

      await fetch("/api/pedidos/catalogo", {
        method: "POST",
        headers,
        body: JSON.stringify({
          items: items.map((i) => ({ sku: i.sku, nombre: i.nombre, precio: i.precio, cantidad: i.cantidad })),
          datos_cliente: {
            nombre: form.nombre,
            dni: form.dni,
            email: form.email,
            direccion: form.direccion,
            entreCalles: form.entreCalles,
            localidad: form.localidad,
            provincia: form.provincia,
            codigoPostal: form.codigoPostal,
            telefono: form.telefono,
            formaPago: form.formaPago,
            notas: form.notas,
            comprobante: uploadedUrl || form.comprobante,
            numeroCliente: numeroCliente,
            ...(cliente?.id ? { cliente_id: cliente.id } : {}),
          },
          subtotal: totals.subtotal,
          descuento_pct: totals.descuentoVolumenPct,
          descuento_monto: totals.descuentoTotalMonto,
          descuento_cliente_pct: totals.descuentoClientePct,
          descuento_vendedor_pct: totals.descuentoVendedorPct,
          envio: totals.envio,
          total: totals.total,
          vendedor_id: vendedorId,
          comision_monto: comisionMonto,
        }),
      });
    } catch (err) {
      console.error("Error guardando pedido:", err);
      // Continuar igual y enviar por WhatsApp
    }

    // Limpiar ref de localStorage solo si el pedido fue generado con ese ref
    // (para no contaminar pedidos futuros con links viejos)
    if (vendedorIdLS) {
      localStorage.removeItem("ref_vendedor_id");
      localStorage.removeItem("ref_codigo");
      localStorage.removeItem("ref_nombre");
    }

    const mensaje = generarMensajeWhatsApp(items, totals, form);
    abrirWhatsApp(mensaje, "5491121816064");
    clearCart();
    setEnviado(true);
  };

  const update = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <main className="mx-auto max-w-2xl px-4 py-6 pb-20">
      <button
        onClick={() => router.push("/catalogo")}
        className="mb-4 flex items-center gap-1 text-sm text-gray-400 hover:text-white"
      >
        <ArrowLeft className="h-4 w-4" />
        Volver al catálogo
      </button>

      <h1 className="flex items-center gap-2 text-2xl font-black text-white">
        <ShoppingBag className="h-7 w-7 text-[#FF5722]" />
        Finalizar pedido
      </h1>

      {/* Resumen del pedido */}
      <div className="mt-6 rounded-xl border border-white/10 bg-white/[0.03] p-4 space-y-2">
        <h2 className="flex items-center gap-2 text-sm font-bold text-gray-300">
          <Package className="h-4 w-4 text-[#FDB71A]" />
          Resumen ({items.length} productos)
        </h2>
        <div className="max-h-40 overflow-y-auto space-y-1 text-sm">
          {items.map((item) => (
            <div key={item.sku} className="flex justify-between text-gray-400">
              <span className="truncate pr-2">
                {item.cantidad}x {item.nombre}{" "}
                <span className="text-[10px] font-mono text-blue-400">({item.sku})</span>
              </span>
              <span className="shrink-0 text-gray-300">{fmtMoney(item.precio * item.cantidad)}</span>
            </div>
          ))}
        </div>
        {/* Tiempo de entrega */}
        <div className="mt-3 rounded-lg border border-[#39FF14]/20 bg-[#39FF14]/5 p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-[#39FF14]" />
              <span className="text-sm font-bold text-[#39FF14]">
                Entrega: 2 a 5 días hábiles
              </span>
            </div>
            <div className="flex items-center gap-1">
              {estadoEntregas === "normal" ? (
                <span className="flex h-2.5 w-2.5 rounded-full bg-[#39FF14] animate-pulse" />
              ) : (
                <span className="flex h-2.5 w-2.5 rounded-full bg-yellow-400 animate-pulse" />
              )}
              <span className={`text-[10px] font-bold ${estadoEntregas === "normal" ? "text-[#39FF14]" : "text-yellow-400"}`}>
                {estadoEntregas === "normal" ? "NORMAL" : "DEMORA"}
              </span>
            </div>
          </div>

          {/* Desplegable de demoras */}
          <button
            type="button"
            onClick={() => setDemorasOpen(!demorasOpen)}
            className="mt-2 flex w-full items-center justify-between rounded bg-white/5 px-2 py-1 text-xs text-gray-400 hover:bg-white/10"
          >
            <span className="flex items-center gap-1">
              <Info className="h-3 w-3" />
              {estadoEntregas === "normal" 
                ? "Ver información sobre demoras" 
                : "Ver detalle de demoras actuales"}
            </span>
            <ChevronDown className={`h-3 w-3 transition-transform ${demorasOpen ? "rotate-180" : ""}`} />
          </button>

          {demorasOpen && (
            <div className="mt-2 rounded bg-white/5 p-2 text-xs text-gray-400 space-y-1">
              {estadoEntregas === "normal" ? (
                <>
                  <p className="text-[#39FF14]">✓ Los pedidos se despachan en 24-48hs</p>
                  <p>✓ Tiempo de entrega: 2 a 5 días hábiles</p>
                  <p>✓ Días hábiles: Lunes a Viernes (no incluye feriados)</p>
                  <p className="text-gray-500 mt-1">En días de alta demanda podrían extenderse los plazos. Serás informado por WhatsApp.</p>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-1 text-yellow-400">
                    <AlertTriangle className="h-3 w-3" />
                    <span className="font-bold">ALTA DEMANDA - Demoras esperadas</span>
                  </div>
                  <p>• Tiempo actual de entrega: 5 a 10 días hábiles</p>
                  <p>• Los pedidos se despachan en 48-72hs</p>
                  <p>• Te contactaremos por WhatsApp con actualizaciones</p>
                  <p className="text-gray-500 mt-1">Disculpá las molestias. Estamos trabajando para normalizar los tiempos.</p>
                </>
              )}
            </div>
          )}
        </div>

        <div className="border-t border-white/10 pt-2 space-y-1">
          <div className="flex justify-between text-sm text-gray-400">
            <span>Subtotal</span>
            <span>{fmtMoney(totals.subtotal)}</span>
          </div>
          {totals.descuentoVolumenPct > 0 && (
            <div className="flex justify-between text-sm text-[#39FF14]">
              <span>Desc. volumen ({totals.descuentoVolumenPct}%)</span>
              <span>-{fmtMoney(totals.descuentoVolumenMonto)}</span>
            </div>
          )}
          {totals.descuentoClientePct > 0 && (
            <div className="flex justify-between text-sm text-blue-400">
              <span>Desc. cliente ({totals.descuentoClientePct}%)</span>
              <span>-{fmtMoney(totals.descuentoClienteMonto)}</span>
            </div>
          )}
          {totals.descuentoVendedorPct > 0 && (
            <div className="flex justify-between text-sm text-purple-400">
              <span>Desc. vendedor ({totals.descuentoVendedorPct}%)</span>
              <span>-{fmtMoney(totals.descuentoVendedorMonto)}</span>
            </div>
          )}
          <div className="flex justify-between text-sm text-gray-400">
            <span>Envío</span>
            <span>{totals.envio === 0 ? "Gratis" : fmtMoney(totals.envio)}</span>
          </div>
          <div className="flex justify-between text-lg font-black text-white">
            <span>Total</span>
            <span className="text-[#FF5722]">{fmtMoney(totals.total)}</span>
          </div>
        </div>
      </div>

      {/* Banner: beneficios de tener vendedor (solo invitados) */}
      {!numeroCliente && (
        <div className="mt-4 rounded-xl border border-purple-500/20 bg-purple-500/5 p-4">
          <div className="flex items-start gap-3">
            <Store className="mt-0.5 h-5 w-5 shrink-0 text-purple-400" />
            <div>
              <p className="text-sm font-bold text-purple-400">
                ¿Tenés un vendedor de confianza?
              </p>
              <p className="mt-1 text-xs text-gray-400">
                Comprar con un vendedor asignado te da acceso a descuentos exclusivos, seguimiento personalizado y prioridad en envíos.
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                <span className="rounded-full border border-purple-500/20 bg-purple-500/10 px-2 py-0.5 text-[10px] text-purple-300">Descuentos extra</span>
                <span className="rounded-full border border-purple-500/20 bg-purple-500/10 px-2 py-0.5 text-[10px] text-purple-300">Seguimiento personalizado</span>
                <span className="rounded-full border border-purple-500/20 bg-purple-500/10 px-2 py-0.5 text-[10px] text-purple-300">Prioridad en envíos</span>
              </div>
              <button
                type="button"
                onClick={() => router.push("/catalogo/cliente/login")}
                className="mt-2 text-xs font-bold text-purple-400 hover:text-purple-300 underline"
              >
                Registrate o ingresá para elegir tu vendedor →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Formulario */}
      <form onSubmit={handleSubmit} className="mt-6 space-y-5">
        {/* Datos personales */}
        <section className="rounded-xl border border-white/10 bg-white/[0.03] p-4 space-y-3">
          <h2 className="flex items-center gap-2 text-sm font-bold text-gray-300">
            <User className="h-4 w-4 text-[#FDB71A]" />
            Datos personales
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-400">Nombre completo *</label>
              <input
                required
                className="input input-sm w-full"
                value={form.nombre}
                onChange={(e) => update("nombre", e.target.value)}
                placeholder="Ej: Juan Pérez"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-400">DNI *</label>
              <input
                required
                className="input input-sm w-full"
                value={form.dni}
                onChange={(e) => update("dni", e.target.value)}
                placeholder="12345678"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-400">Email *</label>
              <input
                required
                type="email"
                className="input input-sm w-full"
                value={form.email}
                onChange={(e) => update("email", e.target.value)}
                placeholder="Ej: juan@email.com"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-400">Teléfono *</label>
              <input
                required
                type="tel"
                className="input input-sm w-full"
                value={form.telefono}
                onChange={(e) => update("telefono", e.target.value)}
                placeholder="Ej: 11 2345 6789"
              />
            </div>
          </div>
        </section>

        {/* Pedidos anteriores */}
        {pedidosAnteriores.length > 0 && (
          <section className="rounded-xl border border-[#FDB71A]/20 bg-[#FDB71A]/5 p-4 space-y-3">
            <h2 className="flex items-center gap-2 text-sm font-bold text-[#FDB71A]">
              <Package className="h-4 w-4" />
              Pedidos anteriores ({pedidosAnteriores.length})
            </h2>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {pedidosAnteriores.map((p) => (
                <div
                  key={p.id}
                  className="rounded-lg border border-white/5 bg-white/[0.03] p-3 text-sm"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs text-blue-400">#{p.id.slice(0, 8)}</span>
                    <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${
                      p.estado === "pendiente" ? "border-yellow-500/30 bg-yellow-500/10 text-yellow-400" :
                      p.estado === "confirmado" ? "border-blue-500/30 bg-blue-500/10 text-blue-400" :
                      p.estado === "pagado" ? "border-green-500/30 bg-green-500/10 text-green-400" :
                      p.estado === "enviado" ? "border-purple-500/30 bg-purple-500/10 text-purple-400" :
                      p.estado === "entregado" ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400" :
                      "border-red-500/30 bg-red-500/10 text-red-400"
                    }`}>
                      {p.estado}
                    </span>
                  </div>
                  <div className="mt-1 text-xs text-gray-400">
                    {p.items?.slice(0, 2).map((item: any, i: number) => (
                      <span key={i} className="mr-2">{item.cantidad}x {item.nombre}</span>
                    ))}
                    {p.items?.length > 2 && <span className="text-gray-600">+{p.items.length - 2} más</span>}
                  </div>
                  <div className="mt-1 flex items-center justify-between">
                    <span className="text-xs text-gray-500">
                      {new Date(p.created_at).toLocaleDateString("es-AR")}
                    </span>
                    <span className="text-sm font-bold text-[#FF5722]">{fmtMoney(p.total)}</span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
        {buscandoPedidos && (
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <div className="h-3 w-3 animate-spin rounded-full border border-gray-500 border-t-transparent" />
            Buscando pedidos anteriores…
          </div>
        )}

        {/* Dirección */}
        <section className="rounded-xl border border-white/10 bg-white/[0.03] p-4 space-y-3">
          <h2 className="flex items-center gap-2 text-sm font-bold text-gray-300">
            <MapPin className="h-4 w-4 text-[#FDB71A]" />
            Dirección de entrega
          </h2>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-400">Dirección *</label>
            <input
              required
              className="input input-sm w-full"
              value={form.direccion}
              onChange={(e) => update("direccion", e.target.value)}
              placeholder="Ej: Av. Rivadavia 1234"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-400">Entre calles *</label>
            <input
              required
              className="input input-sm w-full"
              value={form.entreCalles}
              onChange={(e) => update("entreCalles", e.target.value)}
              placeholder="Ej: Entre calle A y calle B"
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-400">Localidad *</label>
              <input
                required
                className="input input-sm w-full"
                value={form.localidad}
                onChange={(e) => update("localidad", e.target.value)}
                placeholder="Ej: Lomas de Zamora"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-400">Provincia *</label>
              <input
                required
                className="input input-sm w-full"
                value={form.provincia}
                onChange={(e) => update("provincia", e.target.value)}
                placeholder="Ej: Buenos Aires"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-400">Código postal *</label>
              <input
                required
                className="input input-sm w-full"
                value={form.codigoPostal}
                onChange={(e) => update("codigoPostal", e.target.value)}
                placeholder="Ej: 1822"
              />
            </div>
          </div>
        </section>

        {/* Número de cliente */}
        {numeroCliente && (
          <section className="rounded-xl border border-[#39FF14]/20 bg-[#39FF14]/5 p-4">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-[#39FF14]" />
              <p className="text-sm text-[#39FF14]">
                Cliente registrado N° <span className="font-bold">{numeroCliente}</span>
              </p>
            </div>
          </section>
        )}

        {/* Pago */}
        <section className="rounded-xl border border-white/10 bg-white/[0.03] p-4 space-y-3">
          <h2 className="flex items-center gap-2 text-sm font-bold text-gray-300">
            <CreditCard className="h-4 w-4 text-[#FDB71A]" />
            Forma de pago
          </h2>
          <div className="flex flex-wrap gap-2">
            {["Efectivo", "Transferencia", "Mercado Pago", "Tarjeta de crédito", "Tarjeta de débito", "Retiro en local"].map(
              (opcion) => (
                <button
                  key={opcion}
                  type="button"
                  onClick={() => update("formaPago", opcion)}
                  className={`rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
                    form.formaPago === opcion
                      ? "border-[#FF5722] bg-[#FF5722]/20 text-[#FF5722]"
                      : "border-white/10 text-gray-400 hover:border-white/20"
                  }`}
                >
                  {opcion}
                </button>
              )
            )}
          </div>

          {/* Datos bancarios + comprobante para Transferencia */}
          {form.formaPago === "Transferencia" && (
            <div className="mt-3 rounded-xl border border-blue-500/30 bg-blue-500/5 p-4 space-y-3">
              <div className="flex items-center gap-2 mb-1">
                <Banknote className="h-4 w-4 text-blue-400" />
                <p className="text-sm font-bold text-blue-300">Datos para la transferencia</p>
              </div>
              {[
                { label: "Banco", value: DATOS_TRANSFERENCIA.banco, key: "banco" },
                { label: "Tipo de cuenta", value: DATOS_TRANSFERENCIA.tipoCuenta, key: "tipo" },
                { label: "N° de cuenta", value: DATOS_TRANSFERENCIA.numeroCuenta, key: "nrocta" },
                { label: "CBU", value: DATOS_TRANSFERENCIA.cbu, key: "cbu" },
                { label: "Alias", value: DATOS_TRANSFERENCIA.alias, key: "alias" },
                { label: "CUIT", value: DATOS_TRANSFERENCIA.cuit, key: "cuit" },
              ].map(({ label, value, key }) => (
                <div key={key} className="flex items-center justify-between gap-2 rounded-lg bg-white/5 px-3 py-2">
                  <div>
                    <p className="text-[10px] text-gray-500 font-semibold uppercase">{label}</p>
                    <p className="text-sm font-mono text-white font-bold">{value}</p>
                  </div>
                  <button type="button" onClick={() => copyToClipboard(value, key)}
                    className="shrink-0 p-1.5 rounded-lg hover:bg-white/10 transition-colors"
                    title="Copiar">
                    {copiedField === key
                      ? <CheckCircle className="h-4 w-4 text-[#39FF14]" />
                      : <Copy className="h-4 w-4 text-gray-400" />}
                  </button>
                </div>
              ))}

              {/* Upload comprobante */}
              <div className="pt-2 border-t border-white/10 space-y-2">
                <p className="text-xs font-bold text-[#FDB71A] flex items-center gap-1.5">
                  <Upload className="h-3.5 w-3.5" /> Subir comprobante de transferencia *
                </p>
                <label className="flex flex-col items-center justify-center w-full h-24 rounded-xl border-2 border-dashed border-[#FDB71A]/40 bg-[#FDB71A]/5 cursor-pointer hover:border-[#FDB71A]/70 transition-colors">
                  <input type="file" accept="image/*,.pdf" className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) { setComprobanteFile(file); update("comprobante", file.name); }
                    }} />
                  {comprobanteFile ? (
                    <div className="flex items-center gap-2 text-center px-3">
                      <CheckCircle className="h-5 w-5 text-[#39FF14] shrink-0" />
                      <span className="text-xs text-[#39FF14] font-medium break-all">{comprobanteFile.name}</span>
                    </div>
                  ) : (
                    <div className="text-center">
                      <Upload className="h-5 w-5 text-gray-500 mx-auto mb-1" />
                      <span className="text-xs text-gray-500">Tocá para adjuntar imagen o PDF</span>
                    </div>
                  )}
                </label>
                {comprobanteFile && (
                  <button type="button" onClick={() => { setComprobanteFile(null); update("comprobante", ""); }}
                    className="flex items-center gap-1 text-xs text-red-400 hover:text-red-300">
                    <X className="h-3 w-3" /> Quitar archivo
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Info para retiro en local */}
          {form.formaPago === "Retiro en local" && (
            <div className="mt-3 rounded-lg border border-[#39FF14]/20 bg-[#39FF14]/5 p-3">
              <p className="text-xs text-[#39FF14]">
                Retirás el pedido en nuestro local. Te avisaremos cuando esté listo.
              </p>
            </div>
          )}
        </section>

        {/* Notas */}
        <section className="rounded-xl border border-white/10 bg-white/[0.03] p-4 space-y-3">
          <h2 className="flex items-center gap-2 text-sm font-bold text-gray-300">
            <FileText className="h-4 w-4 text-[#FDB71A]" />
            Notas adicionales
          </h2>
          <textarea
            className="input input-sm w-full min-h-[80px]"
            value={form.notas}
            onChange={(e) => update("notas", e.target.value)}
            placeholder="Horario de entrega preferido, instrucciones especiales, etc."
          />
        </section>

        {/* Envío info */}
        <div className="rounded-lg bg-white/5 p-3 text-xs text-gray-400">
          <div className="flex items-start gap-2">
            <Truck className="mt-0.5 h-4 w-4 shrink-0 text-[#FDB71A]" />
            <div>
              <p className="font-medium text-gray-300">Costos de envío:</p>
              <p>• Menos de $30.000 → $10.000</p>
              <p>• Menos de $50.000 → $8.000</p>
              <p>• Menos de $100.000 → $5.000</p>
              <p>• Más de $100.000 → Envío gratis</p>
            </div>
          </div>
        </div>

        {/* Descuentos info */}
        <div className="rounded-lg bg-white/5 p-3 text-xs text-gray-400">
          <div className="flex items-start gap-2">
            <CreditCard className="mt-0.5 h-4 w-4 shrink-0 text-[#39FF14]" />
            <div>
              <p className="font-medium text-gray-300">Descuentos por volumen:</p>
              <p>• Más de $100.000 → 10% OFF</p>
              <p>• Más de $250.000 → 15% OFF</p>
              <p>• Más de $1.000.000 → 20% OFF</p>
            </div>
          </div>
        </div>

        {/* Alerta si es transferencia sin comprobante */}
        {form.formaPago === "Transferencia" && !comprobanteFile && (
          <div className="rounded-xl border border-yellow-500/30 bg-yellow-500/5 p-3 flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-yellow-400 shrink-0 mt-0.5" />
            <p className="text-xs text-yellow-300">
              <strong>Recordá adjuntar el comprobante</strong> de transferencia antes de enviar el pedido. Sin comprobante tu pedido quedará pendiente de verificación.
            </p>
          </div>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={uploadingComprobante}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#39FF14] px-6 py-4 text-lg font-black text-black hover:bg-[#32E612] transition-colors disabled:opacity-60"
        >
          {uploadingComprobante ? (
            <><div className="h-5 w-5 animate-spin rounded-full border-2 border-black border-t-transparent" /> Subiendo comprobante...</>
          ) : (
            <><Send className="h-5 w-5" /> Enviar pedido por WhatsApp</>
          )}
        </button>
        <p className="text-center text-xs text-gray-500">
          El pedido se enviará por WhatsApp al 11-2181-6064
        </p>
      </form>

      {/* Modal de datos de transferencia */}
      {showTransferenciaModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(4px)" }}>
          <div className="w-full max-w-md rounded-2xl border border-blue-500/30 p-6 space-y-4"
            style={{ background: "#0f1629" }}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Banknote className="h-5 w-5 text-blue-400" />
                <h3 className="text-base font-bold text-white">Datos de transferencia</h3>
              </div>
              <button onClick={() => setShowTransferenciaModal(false)}
                className="p-1 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white">
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="text-xs text-gray-400">Realizá la transferencia por <strong className="text-[#FF5722]">{fmtMoney(totals.total)}</strong> a esta cuenta y luego adjuntá el comprobante.</p>
            <div className="space-y-2">
              {[
                { label: "Banco", value: DATOS_TRANSFERENCIA.banco, key: "mbanco" },
                { label: "Tipo de cuenta", value: DATOS_TRANSFERENCIA.tipoCuenta, key: "mtipo" },
                { label: "N° de cuenta", value: DATOS_TRANSFERENCIA.numeroCuenta, key: "mnrocta" },
                { label: "CBU", value: DATOS_TRANSFERENCIA.cbu, key: "mcbu" },
                { label: "Alias", value: DATOS_TRANSFERENCIA.alias, key: "malias" },
                { label: "CUIT", value: DATOS_TRANSFERENCIA.cuit, key: "mcuit" },
              ].map(({ label, value, key }) => (
                <div key={key} className="flex items-center justify-between gap-2 rounded-lg bg-white/5 px-3 py-2">
                  <div>
                    <p className="text-[10px] text-gray-500 font-semibold uppercase">{label}</p>
                    <p className="text-sm font-mono text-white font-bold">{value}</p>
                  </div>
                  <button type="button" onClick={() => copyToClipboard(value, key)}
                    className="shrink-0 p-1.5 rounded-lg hover:bg-white/10">
                    {copiedField === key
                      ? <CheckCircle className="h-4 w-4 text-[#39FF14]" />
                      : <Copy className="h-4 w-4 text-gray-400" />}
                  </button>
                </div>
              ))}
            </div>
            <button
              onClick={() => setShowTransferenciaModal(false)}
              className="w-full rounded-xl bg-blue-600 py-3 font-bold text-white hover:bg-blue-500 transition-colors"
            >
              Ya lo sé, volver al formulario
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
