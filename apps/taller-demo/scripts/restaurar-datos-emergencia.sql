-- RESTAURACION DE EMERGENCIA - VENDEDORES, CLIENTES, GERENTES
-- Ejecutar en Supabase SQL Editor SOLO si se confirmó que los datos se perdieron

-- ============================================================
-- 1. VENDEDORES DE EJEMPLO (modificar con datos reales)
-- ============================================================

INSERT INTO vendedores (
  nombre, email, password_hash, codigo_referido, 
  comision_pct, nivel_vendedor, estado, es_gerente, 
  lider_id, total_vendido, created_at
) VALUES 
-- Gerente principal
('Carlos Gerente', 'gerente@maqjeez.com', 'placeholder_hash', 'GER001', 15, 'master', 'activo', true, null, 500000, now()),

-- Vendedores normales
('Ana Vendedora', 'ana@maqjeez.com', 'placeholder_hash', 'ANA001', 12, 'senior', 'activo', false, null, 200000, now()),
('Pedro Vendedor', 'pedro@maqjeez.com', 'placeholder_hash', 'PED001', 11, 'junior', 'activo', false, null, 50000, now()),
('Maria Vendedora', 'maria@maqjeez.com', 'placeholder_hash', 'MAR001', 10, 'nuevo', 'activo', false, null, 0, now())

ON CONFLICT (codigo_referido) DO NOTHING;

-- Asignar vendedores a gerente
UPDATE vendedores 
SET lider_id = (SELECT id FROM vendedores WHERE codigo_referido = 'GER001')
WHERE codigo_referido IN ('ANA001', 'PED001', 'MAR001') AND es_gerente = false;

-- ============================================================
-- 2. CLIENTES DE EJEMPLO (modificar con datos reales)
-- ============================================================

INSERT INTO clientes_catalogo (
  nombre, email, telefono, dni, password_hash,
  codigo_referido, descuento_cliente_pct, created_at
) VALUES 
('Jose Andrea', 'jose@email.com', '1125523663', '30123456', 'placeholder_hash', 'CLI001', 3, now()),
('Maria Cliente', 'maria@email.com', '1134567890', '28123456', 'placeholder_hash', 'CLI002', 3, now()),
('Pedro Comprador', 'pedro@email.com', '1145678901', '35123456', 'placeholder_hash', 'CLI003', 3, now())

ON CONFLICT (email) DO NOTHING;

-- ============================================================
-- 3. VERIFICAR LO QUE QUEDO
-- ============================================================

SELECT '=== RESUMEN DESPUES DE RESTAURACION ===' as tabla;
SELECT COUNT(*) as vendedores FROM vendedores;
SELECT COUNT(*) as gerentes FROM vendedores WHERE es_gerente = true;
SELECT COUNT(*) as clientes FROM clientes_catalogo;

-- Vendedores con sus gerentes
SELECT 
  v.nombre as vendedor,
  v.codigo_referido,
  v.es_gerente,
  g.nombre as gerente
FROM vendedores v
LEFT JOIN vendedores g ON v.lider_id = g.id;
