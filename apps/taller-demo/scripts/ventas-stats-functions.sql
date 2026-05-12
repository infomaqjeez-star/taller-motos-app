-- Funciones SQL para estadísticas de ventas

-- 1. Estadísticas generales de ventas (basado en items, no en campo total)
CREATE OR REPLACE FUNCTION get_ventas_stats(desde text, hasta text)
RETURNS TABLE (
  total_facturado numeric,
  cant_ventas bigint,
  metodo_top text,
  producto_top text
) AS $$
BEGIN
  RETURN QUERY
  WITH ventas_con_items AS (
    -- Solo ventas que TIENEN items (evitar ventas fantasmas)
    SELECT v.id, v.metodo_pago, v.created_at
    FROM ventas_repuestos v
    WHERE v.created_at::date BETWEEN desde::date AND hasta::date
    AND v.status = 'activa'
    AND EXISTS (SELECT 1 FROM ventas_items vi WHERE vi.venta_id = v.id)
  ),
  stats AS (
    SELECT 
      COALESCE(SUM(vi.subtotal), 0) as total_facturado,
      COUNT(DISTINCT v.id) as cant_ventas,
      MODE() WITHIN GROUP (ORDER BY v.metodo_pago) as metodo_top
    FROM ventas_con_items v
    JOIN ventas_items vi ON vi.venta_id = v.id
  ),
  top_producto AS (
    SELECT vi.producto
    FROM ventas_items vi
    JOIN ventas_repuestos v ON vi.venta_id = v.id
    WHERE v.created_at::date BETWEEN desde::date AND hasta::date
    AND v.status = 'activa'
    GROUP BY vi.producto
    ORDER BY SUM(vi.cantidad) DESC
    LIMIT 1
  )
  SELECT 
    s.total_facturado,
    s.cant_ventas,
    s.metodo_top,
    (SELECT tp.producto FROM top_producto tp LIMIT 1) as producto_top
  FROM stats s;
END;
$$ LANGUAGE plpgsql;

-- 2. Ventas agrupadas por día (basado en items, no en campo total)
CREATE OR REPLACE FUNCTION get_ventas_por_dia(desde text, hasta text)
RETURNS TABLE (
  dia date,
  total numeric,
  cant bigint
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    v.created_at::date as dia,
    COALESCE(SUM(vi.subtotal), 0) as total,
    COUNT(DISTINCT v.id) as cant
  FROM ventas_repuestos v
  JOIN ventas_items vi ON vi.venta_id = v.id
  WHERE v.created_at::date BETWEEN desde::date AND hasta::date
  AND v.status = 'activa'
  GROUP BY v.created_at::date
  ORDER BY v.created_at::date;
END;
$$ LANGUAGE plpgsql;

-- 3. Top productos vendidos
CREATE OR REPLACE FUNCTION get_top_productos(desde text, hasta text)
RETURNS TABLE (
  producto text,
  cantidad bigint,
  total numeric
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    vi.producto,
    SUM(vi.cantidad)::bigint as cantidad,
    COALESCE(SUM(vi.subtotal), 0) as total
  FROM ventas_items vi
  JOIN ventas_repuestos v ON vi.venta_id = v.id
  WHERE v.created_at::date BETWEEN desde::date AND hasta::date
  AND v.status = 'activa'
  GROUP BY vi.producto
  ORDER BY SUM(vi.cantidad) DESC
  LIMIT 5;
END;
$$ LANGUAGE plpgsql;
