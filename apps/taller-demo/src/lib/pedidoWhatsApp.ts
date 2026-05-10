import type { CartItem, CartTotals } from "@/components/catalogo/CartContext";

export interface CheckoutData {
  nombre: string;
  dni: string;
  direccion: string;
  entreCalles: string;
  localidad: string;
  provincia: string;
  codigoPostal: string;
  telefono: string;
  formaPago: string;
  notas?: string;
}

function fmtMoney(n: number) {
  return "$" + n.toLocaleString("es-AR", { maximumFractionDigits: 0 });
}

export function generarMensajeWhatsApp(
  items: CartItem[],
  totals: CartTotals,
  checkout: CheckoutData
): string {
  const lineas = items.map(
    (item) =>
      `• ${item.sku} — ${item.nombre}\n  ${item.cantidad} x ${fmtMoney(item.precio)} = ${fmtMoney(item.precio * item.cantidad)}`
  );

  const parts = [
    `🛒 *NUEVO PEDIDO MAQJEEZ*`,
    "",
    `👤 *Cliente:* ${checkout.nombre}`,
    `🆔 *DNI:* ${checkout.dni}`,
    `📱 *Teléfono:* ${checkout.telefono}`,
    "",
    `📦 *Dirección de entrega:*`,
    `${checkout.direccion}`,
    `Entre: ${checkout.entreCalles}`,
    `${checkout.localidad}, ${checkout.provincia} — CP ${checkout.codigoPostal}`,
    "",
    `💳 *Forma de pago:* ${checkout.formaPago}`,
    ...(checkout.notas ? ["", `📝 *Notas:* ${checkout.notas}`] : []),
    "",
    "📋 *Productos:*",
    ...lineas,
    "",
    `Subtotal: ${fmtMoney(totals.subtotal)}`,
    ...(totals.descuentoVolumenPct > 0
      ? [`Desc. volumen ${totals.descuentoVolumenPct}%: -${fmtMoney(totals.descuentoVolumenMonto)}`]
      : []),
    ...(totals.descuentoClientePct > 0
      ? [`Desc. cliente ${totals.descuentoClientePct}%: -${fmtMoney(totals.descuentoClienteMonto)}`]
      : []),
    ...(totals.descuentoVendedorPct > 0
      ? [`Desc. vendedor ${totals.descuentoVendedorPct}%: -${fmtMoney(totals.descuentoVendedorMonto)}`]
      : []),
    `Envío: ${totals.envio === 0 ? "Gratis" : fmtMoney(totals.envio)}`,
    "",
    `🎯 *TOTAL: ${fmtMoney(totals.total)}*`,
  ];

  return parts.join("\n");
}

export function abrirWhatsApp(mensaje: string, telefono: string) {
  const encoded = encodeURIComponent(mensaje);
  const url = `https://wa.me/${telefono}?text=${encoded}`;
  window.open(url, "_blank");
}
