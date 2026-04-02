// DB layer for MeLi app (Flex only)
import { FlexEnvio } from "./types";

async function dbCall(body: Record<string, unknown>): Promise<Record<string, unknown>> {
  const res = await fetch("/api/db", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error ?? "Error de base de datos");
  return json;
}

function toFlex(r: Record<string, unknown>): FlexEnvio {
  return {
    id:                 r.id as string,
    fecha:              r.fecha as string,
    localidad:          r.localidad as string,
    zona:               r.zona as FlexEnvio["zona"],
    precioML:           r.precio_ml as number,
    pagoFlete:          r.pago_flete as number,
    ganancia:           r.ganancia as number,
    descripcion:        r.descripcion as string,
    nroSeguimiento:     (r.nro_seguimiento as string) ?? "",
    usuarioML:          (r.usuario_ml as string) ?? "",
    nombreDestinatario: (r.nombre_destinatario as string) ?? "",
    direccion:          (r.direccion as string) ?? "",
    codigoPostal:       (r.codigo_postal as string) ?? "",
    productoSku:        (r.producto_sku as string) ?? "",
    packId:             (r.pack_id as string) ?? "",
    createdAt:          r.created_at as string,
  };
}

export const flexDb = {
  async getAll(): Promise<FlexEnvio[]> {
    const { data } = await dbCall({
      action: "select", table: "flex_envios",
      order: { col: "fecha", asc: false },
    });
    return ((data as Record<string, unknown>[]) ?? []).map(toFlex);
  },

  async create(e: FlexEnvio): Promise<{ duplicado: boolean }> {
    const row = {
      id: e.id, fecha: e.fecha, localidad: e.localidad, zona: e.zona,
      precio_ml: e.precioML, pago_flete: e.pagoFlete, ganancia: e.ganancia,
      descripcion: e.descripcion, nro_seguimiento: e.nroSeguimiento || null,
      usuario_ml: e.usuarioML, nombre_destinatario: e.nombreDestinatario,
      direccion: e.direccion, codigo_postal: e.codigoPostal,
      producto_sku: e.productoSku, pack_id: e.packId || null,
      created_at: e.createdAt,
    };
    if (e.nroSeguimiento) {
      await dbCall({ action: "upsert", table: "flex_envios", data: row, onConflict: "nro_seguimiento", ignoreDuplicates: false });
    } else {
      await dbCall({ action: "insert", table: "flex_envios", data: row });
    }
    return { duplicado: false };
  },

  async delete(id: string): Promise<void> {
    await dbCall({ action: "delete", table: "flex_envios", id });
  },

  async updateTarifa(zona: string, nuevoPrecio: number): Promise<void> {
    await dbCall({ action: "update", table: "flex_tarifas", data: { precio: nuevoPrecio }, id: zona, idCol: "zona" });
  },
};
