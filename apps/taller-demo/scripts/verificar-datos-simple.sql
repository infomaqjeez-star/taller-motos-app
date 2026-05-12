-- SCRIPT ULTRA-SIMPLE: no falla si faltan columnas

-- Primero ver qué columnas hay en cada tabla
SELECT 'COLUMNAS DE VENDEDORES' as info;
SELECT column_name FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'vendedores' 
ORDER BY ordinal_position;

SELECT 'COLUMNAS DE CLIENTES_CATALOGO' as info;
SELECT column_name FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'clientes_catalogo' 
ORDER BY ordinal_position;

SELECT 'COLUMNAS DE PEDIDOS_CATALOGO' as info;
SELECT column_name FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'pedidos_catalogo' 
ORDER BY ordinal_position;

-- Contar registros
SELECT 'TOTALES' as info;
SELECT 'vendedores' as tabla, COUNT(*) as total FROM vendedores
UNION ALL
SELECT 'clientes_catalogo', COUNT(*) FROM clientes_catalogo
UNION ALL
SELECT 'pedidos_catalogo', COUNT(*) FROM pedidos_catalogo;

-- Listar vendedores (solo columnas que SIEMPRE existen: id, nombre, email)
SELECT 'VENDEDORES' as info;
SELECT id, nombre, email FROM vendedores ORDER BY created_at DESC LIMIT 50;

-- Listar clientes (solo columnas seguras)
SELECT 'CLIENTES' as info;
SELECT id, nombre, email FROM clientes_catalogo ORDER BY created_at DESC LIMIT 50;

-- Listar pedidos
SELECT 'PEDIDOS' as info;
SELECT id, estado, vendedor_id, total, created_at FROM pedidos_catalogo ORDER BY created_at DESC LIMIT 20;
