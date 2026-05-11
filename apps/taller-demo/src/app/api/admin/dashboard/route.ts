import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase-server";

export async function GET(req: NextRequest) {
  try {
    const supabase = getSupabaseServer();

    // Estadísticas de vendedores
    const { data: vendedores, error: vError } = await supabase
      .from("vendedores")
      .select("id, nombre, email, codigo_referido, comision_pct, nivel_vendedor, total_vendido, created_at, estado");

    // Estadísticas de clientes
    const { data: clientes, error: cError } = await supabase
      .from("clientes")
      .select("id, nombre, email, telefono, dni, created_at");

    // Pedidos
    const { data: pedidos, error: pError } = await supabase
      .from("pedidos_catalogo")
      .select("estado, total, comision_monto, comision_estado, created_at, vendedor_id");

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
    const totalVendedores = vendedores?.length || 0;
    const totalClientes = clientes?.length || 0;
    const totalProductos = productos?.length || 0;
    const totalPedidos = pedidos?.length || 0;

    // Pedidos por estado
    const pedidosPorEstado: Record<string, number> = {};
    pedidos?.forEach(p => {
      pedidosPorEstado[p.estado] = (pedidosPorEstado[p.estado] || 0) + 1;
    });

    // Ventas totales (no canceladas)
    const ventasTotales = pedidos?.reduce((s, p) => s + (p.estado !== "cancelado" ? p.total : 0), 0) || 0;
    const ventasMes = pedidos?.filter(p => new Date(p.created_at) >= hace30Dias)
      .reduce((s, p) => s + (p.estado !== "cancelado" ? p.total : 0), 0) || 0;
    const ventasSemana = pedidos?.filter(p => new Date(p.created_at) >= hace7Dias)
      .reduce((s, p) => s + (p.estado !== "cancelado" ? p.total : 0), 0) || 0;

    // Comisiones
    const comisionesPendientes = pedidos?.reduce((s, p) => s + (p.comision_estado === "pendiente" ? p.comision_monto : 0), 0) || 0;
    const comisionesPagadas = pedidos?.reduce((s, p) => s + (p.comision_estado === "pagada" ? p.comision_monto : 0), 0) || 0;

    // Vendedores por nivel
    const vendedoresPorNivel: Record<string, number> = {};
    vendedores?.forEach(v => {
      vendedoresPorNivel[v.nivel_vendedor || "nuevo"] = (vendedoresPorNivel[v.nivel_vendedor || "nuevo"] || 0) + 1;
    });

    // Top vendedores por ventas
    const topVendedores = (vendedores || [])
      .sort((a, b) => (b.total_vendido || 0) - (a.total_vendido || 0))
      .slice(0, 10)
      .map(v => ({
        id: v.id,
        nombre: v.nombre,
        email: v.email,
        codigo_referido: v.codigo_referido,
        nivel_vendedor: v.nivel_vendedor,
        total_vendido: v.total_vendido || 0,
        comision_pct: v.comision_pct,
        estado: v.estado,
        created_at: v.created_at,
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
      vendedores: vendedores || [],
      clientes: clientes || [],
    });
  } catch (err: any) {
    console.error("admin/dashboard error:", err);
    return NextResponse.json({ error: "Error interno", message: err.message }, { status: 500 });
  }
}
