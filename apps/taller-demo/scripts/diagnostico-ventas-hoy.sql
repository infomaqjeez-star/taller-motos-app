-- DIAGNOSTICO: Ventas de hoy detalladas

-- 1. TODAS las ventas de hoy (sin filtro de status)
SELECT '=== TODAS LAS VENTAS HOY ===' as info;
SELECT 
  v.id,
  v.total as venta_total,
  v.status,
  v.metodo_pago,
  v.created_at
FROM ventas_repuestos v
WHERE v.created_at::date = '2026-05-12'
ORDER BY v.created_at DESC;

-- 2. SOLO ventas ACTIVAS de hoy
SELECT '=== VENTAS ACTIVAS HOY ===' as info;
SELECT 
  v.id,
  v.total as venta_total,
  v.metodo_pago,
  v.created_at
FROM ventas_repuestos v
WHERE v.created_at::date = '2026-05-12'
AND v.status = 'activa'
ORDER BY v.created_at DESC;

-- 3. SUMATORIA REAL de ventas activas hoy
SELECT '=== SUMA REAL ACTIVAS HOY ===' as info;
SELECT 
  COALESCE(SUM(v.total), 0) as total_real,
  COUNT(*) as cantidad
FROM ventas_repuestos v
WHERE v.created_at::date = '2026-05-12'
AND v.status = 'activa';

-- 4. Items de cada venta de hoy
SELECT '=== ITEMS POR VENTA HOY ===' as info;
SELECT 
  v.id as venta_id,
  v.total as venta_total,
  vi.producto,
  vi.cantidad,
  vi.precio_unit,
  vi.subtotal,
  vi.cantidad * vi.precio_unit as calculado
FROM ventas_repuestos v
JOIN ventas_items vi ON vi.venta_id = v.id
WHERE v.created_at::date = '2026-05-12'
AND v.status = 'activa'
ORDER BY v.created_at DESC, vi.producto;

-- 5. Verificar si hay ventas con items que no suman al total
SELECT '=== VERIFICAR TOTALES ===' as info;
SELECT 
  v.id,
  v.total as guardado,
  COALESCE(SUM(vi.subtotal), 0) as calculado_items,
  v.total - COALESCE(SUM(vi.subtotal), 0) as diferencia
FROM ventas_repuestos v
LEFT JOIN ventas_items vi ON vi.venta_id = v.id
WHERE v.created_at::date = '2026-05-12'
AND v.status = 'activa'
GROUP BY v.id, v.total
HAVING ABS(v.total - COALESCE(SUM(vi.subtotal), 0)) > 1;
