-- Migration: Sistema Gerente de Vendedores

-- 1) Columnas en vendedores
ALTER TABLE vendedores ADD COLUMN IF NOT EXISTS lider_id UUID REFERENCES vendedores(id) ON DELETE SET NULL;
ALTER TABLE vendedores ADD COLUMN IF NOT EXISTS es_gerente BOOLEAN DEFAULT false;
CREATE INDEX IF NOT EXISTS idx_vendedor_lider ON vendedores(lider_id);
CREATE INDEX IF NOT EXISTS idx_vendedor_es_gerente ON vendedores(es_gerente);

-- 2) Columnas en pedidos_catalogo para tracking del gerente
ALTER TABLE pedidos_catalogo ADD COLUMN IF NOT EXISTS gerente_id UUID REFERENCES vendedores(id) ON DELETE SET NULL;
ALTER TABLE pedidos_catalogo ADD COLUMN IF NOT EXISTS comision_gerente_monto NUMERIC DEFAULT 0;
CREATE INDEX IF NOT EXISTS idx_pedido_gerente ON pedidos_catalogo(gerente_id);

-- 3) Vista resumen actualizada con jerarquía
DROP VIEW IF EXISTS vendedor_resumen;
CREATE VIEW vendedor_resumen AS
SELECT
    v.id,
    v.codigo_referido,
    v.nombre,
    v.email,
    v.telefono,
    v.comision_pct,
    v.nivel_vendedor,
    v.estado,
    v.lider_id,
    v.es_gerente,
    COUNT(p.id) FILTER (WHERE p.estado <> 'cancelado') AS total_pedidos,
    COALESCE(SUM(p.total) FILTER (WHERE p.estado <> 'cancelado'), 0) AS total_ventas,
    COALESCE(SUM(p.comision_monto) FILTER (WHERE p.comision_estado = 'pendiente'), 0) AS comision_pendiente,
    COALESCE(SUM(p.comision_monto) FILTER (WHERE p.comision_estado = 'pagada'), 0) AS comision_pagada,
    COALESCE(SUM(p.comision_gerente_monto) FILTER (WHERE p.comision_estado = 'pendiente'), 0) AS comision_gerente_pendiente,
    COALESCE(SUM(p.comision_gerente_monto) FILTER (WHERE p.comision_estado = 'pagada'), 0) AS comision_gerente_pagada
FROM vendedores v
LEFT JOIN pedidos_catalogo p ON p.vendedor_id = v.id
GROUP BY v.id, v.codigo_referido, v.nombre, v.email, v.telefono, v.comision_pct, v.nivel_vendedor, v.estado, v.lider_id, v.es_gerente;
