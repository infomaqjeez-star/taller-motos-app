-- DIAGNOSTICO: Verificar datos reales de ventas_repuestos

-- 1. Cuántas ventas hay en total
SELECT 'TOTAL VENTAS' as info, COUNT(*) as total FROM ventas_repuestos;

-- 2. Ventas por status
SELECT 'VENTAS POR STATUS' as info;
SELECT status, COUNT(*) as total FROM ventas_repuestos GROUP BY status;

-- 3. Ventas de hoy (12 de mayo 2026)
SELECT 'VENTAS HOY' as info;
SELECT id, total, status, metodo_pago, created_at::date as fecha, created_at
FROM ventas_repuestos
WHERE created_at::date = '2026-05-12'
ORDER BY created_at DESC;

-- 4. Rango de fechas de todas las ventas
SELECT 'RANGO FECHAS' as info;
SELECT MIN(created_at::date) as primera, MAX(created_at::date) as ultima FROM ventas_repuestos;

-- 5. Ventas esta semana (lun 11 - dom 17 mayo)
SELECT 'VENTAS ESTA SEMANA' as info;
SELECT id, total, status, metodo_pago, created_at::date as fecha
FROM ventas_repuestos
WHERE created_at::date BETWEEN '2026-05-11' AND '2026-05-17'
ORDER BY created_at DESC;

-- 6. Total facturado real (solo activas) hoy
SELECT 'TOTAL HOY ACTIVAS' as info;
SELECT COALESCE(SUM(total), 0) as total_facturado, COUNT(*) as cant
FROM ventas_repuestos
WHERE created_at::date = '2026-05-12' AND status = 'activa';

-- 7. Verificar si created_at tiene zona horaria correcta
SELECT 'EJEMPLO TIMESTAMP' as info;
SELECT created_at, created_at::date, created_at::time
FROM ventas_repuestos
ORDER BY created_at DESC
LIMIT 5;
