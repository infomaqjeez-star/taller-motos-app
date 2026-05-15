"use client";

import { useEffect } from "react";
import { Printer, X, MessageCircle } from "lucide-react";
import { VentaItem, MetodoPago, METODO_PAGO_LABELS } from "@/lib/types";

interface Props {
  isOpen: boolean;
  venta: {
    items: VentaItem[];
    total: number;
    metodoPago: MetodoPago;
    createdAt: string;
  };
  clientData?: {
    nombre?: string;
    dni?: string;
    direccion?: string;
    telefono?: string;
  };
  onClose: () => void;
}

export default function TicketPrinter({ isOpen, venta, clientData, onClose }: Props) {
  if (!isOpen) return null;

  const handlePrint = () => {
    const content = document.getElementById("comprobante-a4");
    if (!content) return;

    const iframe = document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "0";
    iframe.style.visibility = "hidden";
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (!doc) return;

    doc.open();
    doc.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Comprobante MaqJeez</title>
          <style>
            @page { size: A4; margin: 10mm; }
            body { margin: 0; padding: 0; font-family: Arial, sans-serif; color: #333; }
            table { border-collapse: collapse; width: 100%; }
            td, th { padding: 10px; border: 1px solid #ddd; }
            thead tr { background-color: #000 !important; color: #fff !important; }
            tfoot td { font-weight: bold; }
          </style>
        </head>
        <body>
          ${content.innerHTML}
        </body>
      </html>
    `);
    doc.close();

    iframe.onload = () => {
      setTimeout(() => {
        iframe.contentWindow?.print();
        setTimeout(() => document.body.removeChild(iframe), 1000);
      }, 300);
    };

    // Fallback si onload no dispara
    setTimeout(() => {
      iframe.contentWindow?.print();
      setTimeout(() => {
        if (iframe.parentNode) document.body.removeChild(iframe);
      }, 1000);
    }, 500);
  };

  const handleWhatsApp = () => {
    const fecha = formatDateTime(venta.createdAt);
    const metodo = METODO_PAGO_LABELS[venta.metodoPago];
    let texto = `*Comprobante MaqJeez*\n📅 ${fecha}\n\n`;
    texto += `*Cliente:* ${clientName}\n`;
    if (clientDni && clientDni !== "-") texto += `DNI/CUIT: ${clientDni}\n`;
    if (clientDir && clientDir !== "-") texto += `Dirección: ${clientDir}\n`;
    if (clientTel && clientTel !== "-") texto += `Tel: ${clientTel}\n`;
    texto += `\n*Productos:*\n`;
    venta.items.forEach((item) => {
      texto += `• ${item.cantidad}x ${item.producto} — ${formatCurrency(item.precioUnit)} c/u = ${formatCurrency(item.subtotal)}\n`;
    });
    texto += `\n*Total:* ${formatCurrency(venta.total)}\n`;
    texto += `*Método de pago:* ${metodo}\n\n`;
    texto += `_Gracias por confiar en MaqJeez_`;
    const url = `https://wa.me/?text=${encodeURIComponent(texto)}`;
    window.open(url, "_blank");
  };

  const formatCurrency = (n: number) =>
    "$" + n.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const formatDateTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString("es-AR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const clientName = clientData?.nombre || "Consumidor Final";
  const clientDni = clientData?.dni || "-";
  const clientDir = clientData?.direccion || "-";
  const clientTel = clientData?.telefono || "-";

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b">
            <div className="flex items-center gap-2">
              <Printer className="w-4 h-4 text-blue-600" />
              <h2 className="font-bold text-gray-900">Comprobante de Venta A4</h2>
            </div>
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-gray-500 hover:bg-gray-100"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Scrollable preview */}
          <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
            {/* A4 Comprobante */}
            <div
              id="comprobante-a4"
              style={{
                width: "100%",
                maxWidth: "800px",
                margin: "0 auto",
                fontFamily: "Arial, sans-serif",
                color: "#333",
                padding: "20px",
                border: "1px solid #ddd",
                background: "white",
              }}
            >
              {/* Encabezado */}
              <table style={{ width: "100%", marginBottom: "20px", borderBottom: "2px solid #000", paddingBottom: "10px" }}>
                <tr>
                  <td style={{ width: "50%" }}>
                    <h1 style={{ margin: "0", color: "#000", fontSize: "28px" }}>MAQJEEZ</h1>
                    <p style={{ margin: "5px 0", fontWeight: "bold", fontSize: "12px" }}>
                      Venta de Maquinaria y Servicios Técnicos
                    </p>
                    <p style={{ margin: "0", fontSize: "11px", color: "#666" }}>
                      Carlos Spegazzini, Ezeiza - Buenos Aires
                    </p>
                  </td>
                  <td style={{ width: "50%", textAlign: "right", verticalAlign: "top" }}>
                    <h3 style={{ margin: "0", fontSize: "18px", fontWeight: "bold" }}>COMPROBANTE DE VENTA</h3>
                    <p style={{ margin: "5px 0", fontSize: "11px", color: "#666" }}>
                      Fecha: {formatDateTime(venta.createdAt)}
                    </p>
                    <div
                      style={{
                        display: "inline-block",
                        border: "2px solid #000",
                        padding: "8px",
                        marginTop: "5px",
                        fontWeight: "bold",
                        fontSize: "12px",
                      }}
                    >
                      NO VÁLIDO COMO FACTURA
                    </div>
                  </td>
                </tr>
              </table>

              {/* Datos del Cliente */}
              <div
                style={{
                  margin: "20px 0",
                  padding: "10px",
                  backgroundColor: "#f9f9f9",
                  borderRadius: "5px",
                  border: "1px solid #e0e0e0",
                }}
              >
                <h4 style={{ margin: "0 0 10px 0", borderBottom: "1px solid #ccc", fontSize: "13px", fontWeight: "bold" }}>
                  Datos del Cliente
                </h4>
                <table style={{ width: "100%", fontSize: "12px" }}>
                  <tr>
                    <td style={{ width: "50%" }}>
                      <strong>Nombre:</strong> {clientName}
                    </td>
                    <td style={{ width: "50%" }}>
                      <strong>DNI/CUIT:</strong> {clientDni}
                    </td>
                  </tr>
                  <tr>
                    <td>
                      <strong>Dirección:</strong> {clientDir}
                    </td>
                    <td>
                      <strong>Teléfono:</strong> {clientTel}
                    </td>
                  </tr>
                </table>
              </div>

              {/* Tabla de Productos */}
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  marginTop: "20px",
                  marginBottom: "20px",
                }}
              >
                <thead>
                  <tr style={{ backgroundColor: "#000", color: "#fff" }}>
                    <th style={{ padding: "10px", textAlign: "left", border: "1px solid #000", width: "8%" }}>Cant.</th>
                    <th style={{ padding: "10px", textAlign: "left", border: "1px solid #000", width: "37%" }}>
                      Descripción del Producto / Servicio
                    </th>
                    <th style={{ padding: "10px", textAlign: "center", border: "1px solid #000", width: "15%" }}>Garantía</th>
                    <th style={{ padding: "10px", textAlign: "right", border: "1px solid #000", width: "18%" }}>Precio Unit.</th>
                    <th style={{ padding: "10px", textAlign: "right", border: "1px solid #000", width: "22%" }}>Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {venta.items.map((item) => (
                    <tr key={item.id}>
                      <td style={{ padding: "10px", border: "1px solid #ddd", textAlign: "center" }}>{item.cantidad}</td>
                      <td style={{ padding: "10px", border: "1px solid #ddd" }}>
                        {item.producto}
                        {item.sku && <div style={{ fontSize: "10px", color: "#666", marginTop: "2px" }}>SKU: {item.sku}</div>}
                      </td>
                      <td style={{ padding: "10px", border: "1px solid #ddd", textAlign: "center" }}>
                        {item.warrantyDays ? (
                          <span style={{ fontWeight: "bold", color: "#2563EB" }}>{item.warrantyDays} días</span>
                        ) : (
                          <span style={{ color: "#999" }}>—</span>
                        )}
                      </td>
                      <td style={{ padding: "10px", border: "1px solid #ddd", textAlign: "right" }}>
                        {formatCurrency(item.precioUnit)}
                      </td>
                      <td style={{ padding: "10px", border: "1px solid #ddd", textAlign: "right", fontWeight: "bold" }}>
                        {formatCurrency(item.subtotal)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={4} style={{ padding: "10px", textAlign: "right", fontWeight: "bold", fontSize: "14px" }}>
                      TOTAL:
                    </td>
                    <td
                      style={{
                        padding: "10px",
                        textAlign: "right",
                        fontWeight: "bold",
                        fontSize: "16px",
                        border: "2px solid #000",
                        backgroundColor: "#f0f0f0",
                      }}
                    >
                      {formatCurrency(venta.total)}
                    </td>
                  </tr>
                </tfoot>
              </table>

              {/* Sección de Garantía */}
              {venta.items.some(i => i.warrantyDays && i.warrantyDays > 0) && (
                <div
                  style={{
                    margin: "20px 0",
                    padding: "15px",
                    backgroundColor: "#EBF4FF",
                    borderRadius: "5px",
                    border: "1px solid #2563EB",
                  }}
                >
                  <h4 style={{ margin: "0 0 10px 0", fontSize: "13px", fontWeight: "bold", color: "#2563EB" }}>
                    🛡️ GARANTÍA DE PRODUCTOS
                  </h4>
                  <ul style={{ margin: "0", paddingLeft: "20px", fontSize: "11px", color: "#333" }}>
                    {venta.items
                      .filter(item => item.warrantyDays && item.warrantyDays > 0)
                      .map(item => (
                        <li key={item.id} style={{ marginBottom: "5px" }}>
                          <strong>{item.producto}</strong>: Garantía de {item.warrantyDays} días desde la fecha de compra.
                          Cubre defectos de fábrica. No cubre daños por mal uso, accidentes o modificaciones.
                        </li>
                      ))}
                  </ul>
                </div>
              )}

              {/* Pie */}
              <div style={{ marginTop: "30px", textAlign: "center", fontSize: "11px", color: "#777" }}>
                <p>Gracias por confiar en MaqJeez para sus herramientas y servicios técnicos.</p>
                <p>Este documento es un resumen de operación comercial interna.</p>
                <p style={{ marginTop: "10px", fontWeight: "bold" }}>
                  MAQJEEZ · Carlos Spegazzini, Ezeiza · Tel: 11 5900-0486 / 11 2181-6064
                </p>
              </div>
            </div>
          </div>

          {/* Footer with buttons */}
          <div className="flex gap-2 p-4 border-t bg-gray-50">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 rounded-lg text-sm font-semibold bg-gray-200 text-gray-900 hover:bg-gray-300 transition-colors"
            >
              Cerrar
            </button>
            <button
              onClick={handleWhatsApp}
              className="flex-1 px-4 py-2 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 text-white transition-colors"
              style={{ background: "#22c55e" }}
            >
              <MessageCircle className="w-4 h-4" />
              Enviar por WhatsApp
            </button>
            <button
              onClick={handlePrint}
              className="flex-1 px-4 py-2 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 text-white transition-colors"
              style={{ background: "#2563EB" }}
            >
              <Printer className="w-4 h-4" />
              Imprimir A4
            </button>
          </div>
        </div>
      </div>

    </>
  );
}
