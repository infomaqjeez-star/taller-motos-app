-- DIAGNOSTICO: que paso con los vendedores

-- 1. Cuantos vendedores hay ahora
SELECT 'VENDEDORES ACTUALES' as info;
SELECT COUNT(*) as total FROM vendedores;

-- 2. Listar los que existen
SELECT id, nombre, email, codigo_referido, estado FROM vendedores;

-- 3. Pedidos que tenian vendedor_id pero el vendedor ya no existe
SELECT 'PEDIDOS CON VENDEDOR BORRADO' as info;
SELECT DISTINCT vendedor_id 
FROM pedidos_catalogo 
WHERE vendedor_id IS NOT NULL 
AND vendedor_id NOT IN (SELECT id FROM vendedores);

-- 4. Cuantos pedidos tienen vendedor_id NULL vs con vendedor
SELECT 
  COUNT(*) FILTER (WHERE vendedor_id IS NULL) as sin_vendedor,
  COUNT(*) FILTER (WHERE vendedor_id IS NOT NULL) as con_vendedor
FROM pedidos_catalogo;

-- 5. Datos de cliente de pedidos recientes (para buscar a que vendedor iban)
SELECT id, datos_cliente, vendedor_id, created_at 
FROM pedidos_catalogo 
ORDER BY created_at DESC 
LIMIT 20;
