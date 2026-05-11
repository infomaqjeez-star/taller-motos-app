import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase-server";

export async function GET(req: NextRequest) {
  try {
    const supabase = getSupabaseServer();

    // Estadísticas de vendedores (columnas base siempre presentes)
    const { data: vendedores, error: vError } = await supabase
      .from("vendedores")
      .select("id, nombre, email, codigo_referido, comision_pct, nivel_vendedor, total_vendido, created_at, estado");

    // Intentar cargar columnas de gerente opcionales
    let vendedoresConGerente: any[] = vendedores || [];
    try {
      const { data: vg } = await supabase
        .from("vendedores")
        .select("id, lider_id, es_gerente");
      if (vg && vg.length > 0 && "lider_id" in vg[0]) {
        const mapaGerente = Object.fromEntries(vg.map(v => [v.id, v]));
        vendedoresConGerente = (vendedores || []).map(v => ({
          ...v,
          lider_id: mapaGerente[v.id]?.lider_id ?? null,
          es_gerente: mapaGerente[v.id]?.es_gerente ?? false,
        }));
      }
    } catch {}

    // Estadísticas de clientes
    const { data: clientes, error: cError } = await supabase
      .from("clientes")
      .select("id, nombre, email, telefono, dni, created_at");

    // Pedidos (columnas base)
    const { data: pedidos, error: pError } = await supabase
      .from("pedidos_catalogo")
      .select("estado, total, comision_monto, comision_estado, created_at, vendedor_id");

    // Intentar cargar columnas de gerente opcionales en pedidos
    let pedidosConGerente: any[] = pedidos || [];
    try {
      const { data: pg } = await supabase
        .from("pedidos_catalogo")
        .select("id, gerente_id, comision_gerente_monto");
      if (pg && pg.length > 0 && "gerente_id" in pg[0]) {
        pedidosConGerente = (pedidos || []).map((p, i) => ({
          ...p,
          gerente_id: pg[i]?.gerente_id ?? null,
          comision_gerente_monto: pg[i]?.comision_gerente_monto ?? 0,
        }));
      }
    } catch {}

    // Carritos abandonados (clientes que tienen items en carrito pero no hicieron pedido)
    const { data: carritos, error: cartError } = await supabase
      .from("cart_items")
      .select("cliente_id, sku, cantidad, created_at");

    // Productos activos
    const { data: productos, error: prodError } = await supabase
      .from("catalog_products")
      .select("id, active")
      .eq("active", true);

    if (vError || cError || pError || cartError || prodError) {
      return NextResponse.json({
        error: "Error al cargar estadísticas",
        details: { vError: vError?.message, cError: cError?.message, pError: pError?.message, cartError: cartError?.message, prodError: prodError?.message }
      }, { status: 500 });
    }

    const hoy = new Date();
    const hace30Dias = new Date(hoy.getTime() - 30 * 24 * 60 * 60 * 1000);
    const hace7Dias = new Date(hoy.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Calcular métricas
    const totalVendedores = vendedoresConGerente?.length || 0;
    const totalClientes = clientes?.length || 0;
    const totalProductos = productos?.length || 0;
    const totalPedidos = pedidosConGerente?.length || 0;

    // Pedidos por estado
    const pedidosPorEstado: Record<string, number> = {};
    pedidosConGerente?.forEach((p: any) => {
      pedidosPorEstado[p.estado] = (pedidosPorEstado[p.estado] || 0) + 1;
    });

    // Ventas totales (no canceladas)
    const ventasTotales = pedidosConGerente?.reduce((s: number, p: any) => s + (p.estado !== "cancelado" ? p.total : 0), 0) || 0;
    const ventasMes = pedidosConGerente?.filter((p: any) => new Date(p.created_at) >= hace30Dias)
      .reduce((s: number, p: any) => s + (p.estado !== "cancelado" ? p.total : 0), 0) || 0;
    const ventasSemana = pedidosConGerente?.filter((p: any) => new Date(p.created_at) >= hace7Dias)
      .reduce((s: number, p: any) => s + (p.estado !== "cancelado" ? p.total : 0), 0) || 0;

    // Comisiones
    const comisionesPendientes = pedidosConGerente?.reduce((s: number, p: any) => s + (p.comision_estado === "pendiente" ? p.comision_monto : 0), 0) || 0;
    const comisionesPagadas = pedidosConGerente?.reduce((s: number, p: any) => s + (p.comision_estado === "pagada" ? p.comision_monto : 0), 0) || 0;

    // Vendedores por nivel
    const vendedoresPorNivel: Record<string, number> = {};
    vendedoresConGerente?.forEach((v: any) => {
      vendedoresPorNivel[v.nivel_vendedor || "nuevo"] = (vendedoresPorNivel[v.nivel_vendedor || "nuevo"] || 0) + 1;
    });

    // Top vendedores por ventas
    const topVendedores = (vendedoresConGerente || [])
      .sort((a: any, b: any) => (b.total_vendido || 0) - (a.total_vendido || 0))
      .slice(0, 10)
      .map((v: any) => ({
        id: v.id,
        nombre: v.nombre,
        email: v.email,
        codigo_referido: v.codigo_referido,
        nivel_vendedor: v.nivel_vendedor,
        total_vendido: v.total_vendido || 0,
        comision_pct: v.comision_pct,
        estado: v.estado,
        created_at: v.created_at,
        lider_id: v.lider_id ?? null,
        es_gerente: v.es_gerente ?? false,
      }));

    // Clientes recientes
    const clientesRecientes = (clientes || [])
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 10);

    // Carritos abandonados (clientes únicos con items en carrito)
    const carritosClientesUnicos = new Set(carritos?.map(c => c.cliente_id) || []);
    const totalCarritosAbandonados = carritosClientesUnicos.size;

    // Items en carritos
    const totalItemsCarrito = carritos?.reduce((s, c) => s + c.cantidad, 0) || 0;

    // Evolución mensual (últimos 6 meses)
    const meses = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
    const hoyM = new Date();
    const evolucionVentas = [];
    const evolucionComisiones = [];
    const labelsEvolucion = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(hoyM.getFullYear(), hoyM.getMonth() - i, 1);
      const inicio = new Date(d.getFullYear(), d.getMonth(), 1);
      const fin = new Date(d.getFullYear(), d.getMonth() + 1, 1);
      labelsEvolucion.push(meses[d.getMonth()]);
      const ventasMesI = pedidosConGerente?.filter((p: any) => {
        const dp = new Date(p.created_at);
        return dp >= inicio && dp < fin && p.estado !== "cancelado";
      }).reduce((s: number, p: any) => s + p.total, 0) || 0;
      const comMesI = pedidosConGerente?.filter((p: any) => {
        const dp = new Date(p.created_at);
        return dp >= inicio && dp < fin && p.estado !== "cancelado";
      }).reduce((s: number, p: any) => s + (p.comision_monto || 0), 0) || 0;
      evolucionVentas.push(ventasMesI);
      evolucionComisiones.push(comMesI);
    }

    return NextResponse.json({
      resumen: {
        totalVendedores,
        totalClientes,
        totalProductos,
        totalPedidos,
        ventasTotales,
        ventasMes,
        ventasSemana,
        comisionesPendientes,
        comisionesPagadas,
        totalCarritosAbandonados,
        totalItemsCarrito,
      },
      pedidosPorEstado,
      vendedoresPorNivel,
      topVendedores,
      clientesRecientes,
      carritosAbandonados: carritos?.slice(0, 20) || [],
      vendedores: vendedoresConGerente || [],
      clientes: clientes || [],
      evolucion: {
        labels: labelsEvolucion,
        ventas: evolucionVentas,
        comisiones: evolucionComisiones,
      },
    });
  } catch (err: any) {
    console.error("admin/dashboard error:", err);
    return NextResponse.json({ error: "Error interno", message: err.message }, { status: 500 });
  }
}
