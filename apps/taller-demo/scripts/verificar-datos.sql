-- VERIFICAR SI EXISTEN DATOS EN LAS TABLAS
-- Ejecutar esto en Supabase SQL Editor para verificar si hay datos

-- ============================================================
-- 0. PRIMERO: ver qué columnas existen en cada tabla
-- ============================================================
SELECT '=== COLUMNAS DE TABLAS ===' as tabla;
SELECT 
  table_name,
  column_name,
  data_type
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name IN ('vendedores', 'clientes_catalogo', 'pedidos_catalogo')
ORDER BY table_name, ordinal_position;

-- ============================================================
-- 1. VENDEDORES
-- ============================================================
SELECT '=== VENDEDORES ===' as tabla;
SELECT 
  id,
  nombre,
  email,
  codigo_referido,
  comision_pct,
  nivel_vendedor,
  estado,
  es_gerente,
  lider_id,
  created_at
FROM vendedores
ORDER BY created_at DESC;

-- 2. Contar vendedores
SELECT '=== TOTAL VENDEDORES ===' as tabla;
SELECT COUNT(*) as total_vendedores FROM vendedores;
SELECT COUNT(*) as vendedores_activos FROM vendedores WHERE estado = 'activo';
SELECT COUNT(*) as gerentes FROM vendedores WHERE es_gerente = true;

-- ============================================================
-- 3. CLIENTES
-- ============================================================
SELECT '=== CLIENTES ===' as tabla;
SELECT 
  id,
  nombre,
  email,
  telefono,
  dni,
  codigo_referido,
  descuento_cliente_pct,
  created_at
FROM clientes_catalogo
ORDER BY created_at DESC
LIMIT 50;

-- 4. Contar clientes
SELECT '=== TOTAL CLIENTES ===' as tabla;
SELECT COUNT(*) as total_clientes FROM clientes_catalogo;

-- ============================================================
-- 5. PEDIDOS
-- ============================================================
SELECT '=== PEDIDOS CON VENDEDORES ===' as tabla;
SELECT 
  p.id,
  p.created_at,
  p.estado,
  p.vendedor_id,
  p.total,
  p.comision_monto,
  p.comision_estado
FROM pedidos_catalogo p
WHERE p.vendedor_id IS NOT NULL
ORDER BY p.created_at DESC
LIMIT 20;

-- Pedidos sin vendedor
SELECT '=== PEDIDOS SIN VENDEDOR ===' as tabla;
SELECT COUNT(*) as pedidos_sin_vendedor FROM pedidos_catalogo WHERE vendedor_id IS NULL;

-- ============================================================
-- 6. JERARQUÍA
-- ============================================================
SELECT '=== JERARQUIA ===' as tabla;
SELECT 
  v.id,
  v.nombre as vendedor,
  v.codigo_referido,
  v.es_gerente,
  g.nombre as gerente_asignado,
  g.codigo_referido as codigo_gerente
FROM vendedores v
LEFT JOIN vendedores g ON v.lider_id = g.id
ORDER BY v.es_gerente DESC, v.nombre;

-- ============================================================
-- 7. VERIFICACIÓN GENERAL
-- ============================================================
SELECT '=== VERIFICACION DE TABLAS ===' as tabla;
SELECT 
  schemaname,
  tablename,
  (SELECT COUNT(*) FROM vendedores) as count_vendedores,
  (SELECT COUNT(*) FROM clientes_catalogo) as count_clientes,
  (SELECT COUNT(*) FROM pedidos_catalogo) as count_pedidos
FROM pg_tables 
WHERE tablename IN ('vendedores', 'clientes_catalogo', 'pedidos_catalogo')
AND schemaname = 'public';
