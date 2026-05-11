"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "@/components/catalogo/CartContext";
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
} from "lucide-react";

function fmtMoney(n: number) {
  return "$" + n.toLocaleString("es-AR", { maximumFractionDigits: 0 });
}

export default function CheckoutPage() {
  const router = useRouter();
  const { items, totals, clearCart } = useCart();

  const [form, setForm] = useState({
    nombre: "",
    dni: "",
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

  const [numeroCliente, setNumeroCliente] = useState<string | null>(null);
  const [enviado, setEnviado] = useState(false);
  const [demorasOpen, setDemorasOpen] = useState(false);

  // Estado de entregas: 'normal' | 'demora'
  const estadoEntregas = "normal"; // Cambiar a "demora" cuando haya alta demanda

  // Obtener número de cliente del localStorage al cargar
  useEffect(() => {
    const stored = localStorage.getItem("cliente_numero");
    if (stored) setNumeroCliente(stored);
  }, []);

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

    // Obtener vendedor referido del localStorage
    const vendedorId = localStorage.getItem("ref_vendedor_id");
    let comisionMonto = 0;
    let comisionPct = 0;

    // Si hay vendedor, calcular comisión según su nivel
    if (vendedorId) {
      try {
        const res = await fetch(`/api/vendedor/public?codigo=${encodeURIComponent(localStorage.getItem("ref_codigo") || "")}`);
        const data = await res.json();
        if (data.vendedor) {
          // Comisión según nivel: nuevo/junior 10%, senior/senior_pro 12%, master 15%
          const nivel = data.vendedor.nivel_vendedor || "nuevo";
          const pctMap: Record<string, number> = {
            nuevo: 10,
            junior: 11,
            senior: 12,
            senior_pro: 12,
            master: 15,
          };
          comisionPct = pctMap[nivel] || 10;
          comisionMonto = Math.round((totals.subtotal * comisionPct) / 100);
        }
      } catch {
        // fallback 10%
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
            direccion: form.direccion,
            entreCalles: form.entreCalles,
            localidad: form.localidad,
            provincia: form.provincia,
            codigoPostal: form.codigoPostal,
            telefono: form.telefono,
            formaPago: form.formaPago,
            notas: form.notas,
            comprobante: form.comprobante,
            numeroCliente: numeroCliente,
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

          {/* Campo para comprobante de transferencia */}
          {form.formaPago === "Transferencia" && (
            <div className="mt-3 rounded-lg border border-[#FDB71A]/20 bg-[#FDB71A]/5 p-3 space-y-2">
              <p className="text-xs text-[#FDB71A] font-medium">
                Adjuntá el comprobante de transferencia
              </p>
              <input
                type="file"
                accept="image/*,.pdf"
                className="block w-full text-xs text-gray-400 file:mr-2 file:rounded-lg file:border-0 file:bg-[#FF5722] file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-white hover:file:bg-[#E64A19]"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    // Guardar nombre del archivo como referencia
                    update("comprobante", file.name);
                  }
                }}
              />
              {form.comprobante && (
                <p className="text-xs text-[#39FF14]">
                  Archivo seleccionado: {form.comprobante}
                </p>
              )}
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

        {/* Submit */}
        <button
          type="submit"
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#39FF14] px-6 py-4 text-lg font-black text-black hover:bg-[#32E612] transition-colors"
        >
          <Send className="h-5 w-5" />
          Enviar pedido por WhatsApp
        </button>
        <p className="text-center text-xs text-gray-500">
          El pedido se enviará por WhatsApp al 11-2181-6064
        </p>
      </form>
    </main>
  );
}
