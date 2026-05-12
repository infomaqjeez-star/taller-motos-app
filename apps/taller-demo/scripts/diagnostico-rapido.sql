-- DIAGNOSTICO RAPIDO - todo en una sola tabla

SELECT '1. TOTAL VENDEDORES' as dato, COUNT(*)::text as valor FROM vendedores
UNION ALL
SELECT '2. VENDEDORES ACTIVOS', COUNT(*)::text FROM vendedores WHERE estado = 'activo'
UNION ALL
SELECT '3. TOTAL CLIENTES', COUNT(*)::text FROM clientes_catalogo
UNION ALL
SELECT '4. TOTAL PEDIDOS', COUNT(*)::text FROM pedidos_catalogo
UNION ALL
SELECT '5. PEDIDOS CON VENDEDOR', COUNT(*)::text FROM pedidos_catalogo WHERE vendedor_id IS NOT NULL
UNION ALL
SELECT '6. PEDIDOS SIN VENDEDOR', COUNT(*)::text FROM pedidos_catalogo WHERE vendedor_id IS NULL;
