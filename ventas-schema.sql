-- ============================================================
-- MÓDULO VENTAS REPUESTOS — MAQJEEZ
-- Ejecutar en Supabase SQL Editor
-- ============================================================

-- 1. Tabla principal de ventas
CREATE TABLE IF NOT EXISTS ventas_repuestos (
  id            TEXT PRIMARY KEY,
  vendedor      TEXT NOT NULL DEFAULT 'Maqjeez',
  metodo_pago   TEXT NOT NULL CHECK (metodo_pago IN ('efectivo','transferencia','debito','credito','mercado_pago')),
  total         NUMERIC(12,2) NOT NULL DEFAULT 0,
  status        TEXT NOT NULL DEFAULT 'activa' CHECK (status IN ('activa','cancelada')),
  notas         TEXT DEFAULT '',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Líneas de detalle (múltiples productos por venta)
CREATE TABLE IF NOT EXISTS ventas_items (
  id          TEXT PRIMARY KEY,
  venta_id    TEXT NOT NULL REFERENCES ventas_repuestos(id) ON DELETE CASCADE,
  producto    TEXT NOT NULL,
  sku         TEXT DEFAULT '',
  cantidad    INTEGER NOT NULL DEFAULT 1 CHECK (cantidad > 0),
  precio_unit NUMERIC(12,2) NOT NULL DEFAULT 0,
  subtotal    NUMERIC(12,2) GENERATED ALWAYS AS (cantidad * precio_unit) STORED
);

-- 3. Índices para queries rápidas de estadísticas
CREATE INDEX IF NOT EXISTS idx_ventas_created  ON ventas_repuestos(created_at);
CREATE INDEX IF NOT EXISTS idx_ventas_status   ON ventas_repuestos(status);
CREATE INDEX IF NOT EXISTS idx_items_venta_id  ON ventas_items(venta_id);

-- 4. RLS (habilitar pero permitir todo para MVP)
ALTER TABLE ventas_repuestos ENABLE ROW LEVEL SECURITY;
ALTER TABLE ventas_items     ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "allow_all_ventas"      ON ventas_repuestos;
DROP POLICY IF EXISTS "allow_all_ventas_items" ON ventas_items;

CREATE POLICY "allow_all_ventas"       ON ventas_repuestos FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_ventas_items" ON ventas_items     FOR ALL USING (true) WITH CHECK (true);

-- ============================================================
-- FUNCIONES SQL PARA ESTADÍSTICAS (ejecutadas server-side)
-- ============================================================

-- 5. Totales por rango de fechas
CREATE OR REPLACE FUNCTION get_ventas_stats(fecha_desde DATE, fecha_hasta DATE)
RETURNS TABLE (
  total_facturado   NUMERIC,
  cant_ventas       BIGINT,
  metodo_top        TEXT,
  producto_top      TEXT
) LANGUAGE sql STABLE AS $$
  SELECT
    COALESCE(SUM(v.total), 0)                                              AS total_facturado,
    COUNT(*)                                                               AS cant_ventas,
    (
      SELECT metodo_pago FROM ventas_repuestos
      WHERE status = 'activa'
        AND created_at::date BETWEEN fecha_desde AND fecha_hasta
      GROUP BY metodo_pago ORDER BY COUNT(*) DESC LIMIT 1
    )                                                                      AS metodo_top,
    (
      SELECT i.producto FROM ventas_items i
      JOIN ventas_repuestos v2 ON v2.id = i.venta_id
      WHERE v2.status = 'activa'
        AND v2.created_at::date BETWEEN fecha_desde AND fecha_hasta
      GROUP BY i.producto ORDER BY SUM(i.cantidad) DESC LIMIT 1
    )                                                                      AS producto_top
  FROM ventas_repuestos v
  WHERE v.status = 'activa'
    AND v.created_at::date BETWEEN fecha_desde AND fecha_hasta;
$$;

-- 6. Ventas agrupadas por día (para gráfico semanal/mensual)
CREATE OR REPLACE FUNCTION get_ventas_por_dia(fecha_desde DATE, fecha_hasta DATE)
RETURNS TABLE (
  dia     DATE,
  total   NUMERIC,
  cant    BIGINT
) LANGUAGE sql STABLE AS $$
  SELECT
    created_at::date  AS dia,
    SUM(total)        AS total,
    COUNT(*)          AS cant
  FROM ventas_repuestos
  WHERE status = 'activa'
    AND created_at::date BETWEEN fecha_desde AND fecha_hasta
  GROUP BY created_at::date
  ORDER BY dia;
$$;

-- 7. Top productos por cantidad vendida
CREATE OR REPLACE FUNCTION get_top_productos(fecha_desde DATE, fecha_hasta DATE, top_n INTEGER DEFAULT 5)
RETURNS TABLE (
  producto TEXT,
  cantidad BIGINT,
  total    NUMERIC
) LANGUAGE sql STABLE AS $$
  SELECT
    i.producto,
    SUM(i.cantidad)  AS cantidad,
    SUM(i.subtotal)  AS total
  FROM ventas_items i
  JOIN ventas_repuestos v ON v.id = i.venta_id
  WHERE v.status = 'activa'
    AND v.created_at::date BETWEEN fecha_desde AND fecha_hasta
  GROUP BY i.producto
  ORDER BY SUM(i.cantidad) DESC
  LIMIT top_n;
$$;
