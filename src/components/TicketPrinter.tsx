"use client";

import { useEffect } from "react";
import { Printer, X } from "lucide-react";
import { VentaItem, MetodoPago } from "@/lib/types";

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
  };
  onClose: () => void;
}

export default function TicketPrinter({ isOpen, venta, clientData, onClose }: Props) {
  if (!isOpen) return null;

  const handlePrint = () => {
    setTimeout(() => {
      window.print();
    }, 100);
  };

  const formatCurrency = (n: number) =>
    "$" + n.toLocaleString("es-AR", { minimumFractionDigits: 0, maximumFractionDigits: 0 });

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

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-2xl w-full max-w-sm max-h-[90vh] flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b">
            <div className="flex items-center gap-2">
              <Printer className="w-4 h-4 text-blue-600" />
              <h2 className="font-bold text-gray-900">Vista Previa del Ticket</h2>
            </div>
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-gray-500 hover:bg-gray-100"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Scrollable ticket preview */}
          <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
            {/* Ticket content (styled for 80mm thermal printer) */}
            <div
              id="ticket-content"
              className="bg-white p-3"
              style={{
                fontFamily: "'Courier New', monospace",
                fontSize: "12px",
                width: "80mm",
                margin: "0 auto",
                border: "1px solid #ddd",
              }}
            >
              {/* Encabezado */}
              <div style={{ textAlign: "center", marginBottom: "10px" }}>
                <h2 style={{ margin: "0 0 2px 0", fontSize: "18px", fontWeight: "bold" }}>
                  MAQJEEZ
                </h2>
                <p style={{ margin: "2px 0", fontSize: "10px", color: "#666" }}>
                  Venta de Maquinaria y Servicios Técnicos
                </p>
                <p style={{ margin: "2px 0", fontSize: "10px", color: "#666" }}>
                  Carlos Spegazzini, Ezeiza - Buenos Aires
                </p>
              </div>

              {/* Advertencia Legal */}
              <div
                style={{
                  textAlign: "center",
                  margin: "5px 0",
                  padding: "3px",
                  border: "1px solid #000",
                  fontWeight: "bold",
                  fontSize: "11px",
                }}
              >
                NO VÁLIDO COMO FACTURA
              </div>

              {/* Datos del Cliente */}
              <div style={{ marginTop: "10px", marginBottom: "10px", fontSize: "11px" }}>
                <p style={{ margin: "0 0 2px 0" }}>
                  <strong>Cliente:</strong> {clientName}
                </p>
                {clientData?.dni && (
                  <p style={{ margin: "0 0 2px 0" }}>
                    <strong>DNI/CUIT:</strong> {clientData.dni}
                  </p>
                )}
                {clientData?.direccion && (
                  <p style={{ margin: "0 0 2px 0" }}>
                    <strong>Dir:</strong> {clientData.direccion}
                  </p>
                )}
              </div>

              {/* Separador */}
              <div style={{ borderTop: "1px dashed #000", margin: "10px 0" }} />

              {/* Tabla de productos */}
              <table style={{ width: "100%", marginBottom: "10px", fontSize: "11px" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid #000" }}>
                    <th style={{ textAlign: "left", padding: "2px 0" }}>Cant.</th>
                    <th style={{ textAlign: "left", padding: "2px 0" }}>Producto</th>
                    <th style={{ textAlign: "right", padding: "2px 0" }}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {venta.items.map((item) => (
                    <tr key={item.id}>
                      <td style={{ textAlign: "left", padding: "2px 0" }}>{item.cantidad}</td>
                      <td style={{ textAlign: "left", padding: "2px 0", flex: 1 }}>
                        {item.producto.substring(0, 20)}
                      </td>
                      <td style={{ textAlign: "right", padding: "2px 0" }}>
                        {formatCurrency(item.subtotal)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Separador final */}
              <div style={{ borderTop: "1px dashed #000", margin: "10px 0" }} />

              {/* Total */}
              <div
                style={{
                  textAlign: "right",
                  fontSize: "14px",
                  fontWeight: "bold",
                  marginBottom: "10px",
                }}
              >
                TOTAL: {formatCurrency(venta.total)}
              </div>

              {/* Pie */}
              <div style={{ textAlign: "center", marginTop: "10px", fontSize: "10px" }}>
                <p style={{ margin: "2px 0" }}>¡Gracias por su compra en MaqJeez!</p>
                <p style={{ margin: "2px 0", color: "#666" }}>
                  {formatDateTime(venta.createdAt)}
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
              onClick={handlePrint}
              className="flex-1 px-4 py-2 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 text-white transition-colors"
              style={{ background: "#2563EB" }}
            >
              <Printer className="w-4 h-4" />
              Imprimir
            </button>
          </div>
        </div>
      </div>

      {/* Print styles */}
      <style>{`
        @media print {
          body {
            margin: 0;
            padding: 0;
          }
          
          * {
            box-shadow: none !important;
            background: white !important;
            color: black !important;
          }
          
          #ticket-content {
            margin: 0 !important;
            border: none !important;
            width: 80mm !important;
            max-width: 100%;
            font-family: 'Courier New', monospace;
            font-size: 12px;
            line-height: 1.4;
          }
          
          button {
            display: none !important;
          }
          
          .fixed {
            display: none !important;
          }
          
          div[class*="modal"],
          div[class*="overlay"],
          div[class*="Modal"] {
            display: none !important;
          }
        }
      `}</style>
    </>
  );
}
