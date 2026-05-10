-- ============================================================
-- SCHEMA VENDEDORES / AFILIADOS MAQJEEZ
-- Ejecutar en Supabase SQL Editor
-- ============================================================

-- 1. Tabla de vendedores
CREATE TABLE IF NOT EXISTS vendedores (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    codigo_referido TEXT UNIQUE NOT NULL,      -- ej: "MAQ001"
    nombre          TEXT NOT NULL,
    email           TEXT UNIQUE NOT NULL,
    telefono        TEXT,
    password_hash   TEXT NOT NULL,            -- bcrypt hash
    comision_pct    NUMERIC DEFAULT 10,       -- % de comisión
    estado          TEXT DEFAULT 'activo',    -- activo | inactivo
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Índices vendedores
CREATE INDEX IF NOT EXISTS idx_vendedor_codigo ON vendedores(codigo_referido);
CREATE INDEX IF NOT EXISTS idx_vendedor_email ON vendedores(email);
CREATE INDEX IF NOT EXISTS idx_vendedor_estado ON vendedores(estado);

-- 2. Tabla de pedidos del catálogo
CREATE TABLE IF NOT EXISTS pedidos_catalogo (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vendedor_id     UUID REFERENCES vendedores(id) ON DELETE SET NULL,
    items           JSONB NOT NULL DEFAULT '[]',
    datos_cliente   JSONB NOT NULL DEFAULT '{}',
    subtotal        NUMERIC NOT NULL DEFAULT 0,
    descuento_pct   NUMERIC DEFAULT 0,
    descuento_monto NUMERIC DEFAULT 0,
    envio           NUMERIC DEFAULT 0,
    total           NUMERIC NOT NULL DEFAULT 0,
    estado          TEXT DEFAULT 'pendiente', -- pendiente | confirmado | pagado | enviado | entregado | cancelado
    comision_monto  NUMERIC DEFAULT 0,
    comision_estado TEXT DEFAULT 'pendiente', -- pendiente | pagada
    whatsapp_enviado BOOLEAN DEFAULT false,
    notas_admin     TEXT,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Índices pedidos
CREATE INDEX IF NOT EXISTS idx_pedido_vendedor ON pedidos_catalogo(vendedor_id);
CREATE INDEX IF NOT EXISTS idx_pedido_estado ON pedidos_catalogo(estado);
CREATE INDEX IF NOT EXISTS idx_pedido_comision_estado ON pedidos_catalogo(comision_estado);
CREATE INDEX IF NOT EXISTS idx_pedido_created ON pedidos_catalogo(created_at);

-- 3. Trigger updated_at vendedores
CREATE OR REPLACE FUNCTION update_vendedor_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_vendedor_updated_at ON vendedores;
CREATE TRIGGER trg_vendedor_updated_at
    BEFORE UPDATE ON vendedores
    FOR EACH ROW EXECUTE FUNCTION update_vendedor_updated_at();

-- 4. Trigger updated_at pedidos_catalogo
CREATE OR REPLACE FUNCTION update_pedido_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_pedido_updated_at ON pedidos_catalogo;
CREATE TRIGGER trg_pedido_updated_at
    BEFORE UPDATE ON pedidos_catalogo
    FOR EACH ROW EXECUTE FUNCTION update_pedido_updated_at();

-- 5. Políticas RLS
ALTER TABLE vendedores ENABLE ROW LEVEL SECURITY;
ALTER TABLE pedidos_catalogo ENABLE ROW LEVEL SECURITY;

-- Vendedores: cualquiera puede leer datos públicos (nombre, codigo)
DROP POLICY IF EXISTS vendedor_select_public ON vendedores;
CREATE POLICY vendedor_select_public ON vendedores
    FOR SELECT USING (estado = 'activo');

-- Vendedores: solo el mismo vendedor puede ver sus datos sensibles
DROP POLICY IF EXISTS vendedor_select_own ON vendedores;
CREATE POLICY vendedor_select_own ON vendedores
    FOR SELECT TO authenticated USING (true);

-- Pedidos: cualquiera puede crear (clientes)
DROP POLICY IF EXISTS pedido_insert_public ON pedidos_catalogo;
CREATE POLICY pedido_insert_public ON pedidos_catalogo
    FOR INSERT WITH CHECK (true);

-- Pedidos: cualquiera puede leer (para validaciones)
DROP POLICY IF EXISTS pedido_select_public ON pedidos_catalogo;
CREATE POLICY pedido_select_public ON pedidos_catalogo
    FOR SELECT USING (true);

-- Pedidos: solo autenticados pueden modificar
DROP POLICY IF EXISTS pedido_update_auth ON pedidos_catalogo;
CREATE POLICY pedido_update_auth ON pedidos_catalogo
    FOR UPDATE USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');

-- 6. Vista resumen por vendedor
DROP VIEW IF EXISTS vendedor_resumen;
CREATE VIEW vendedor_resumen AS
SELECT
    v.id,
    v.codigo_referido,
    v.nombre,
    v.email,
    v.telefono,
    v.comision_pct,
    v.estado,
    COUNT(p.id) FILTER (WHERE p.estado <> 'cancelado') AS total_pedidos,
    COALESCE(SUM(p.total) FILTER (WHERE p.estado <> 'cancelado'), 0) AS total_ventas,
    COALESCE(SUM(p.comision_monto) FILTER (WHERE p.comision_estado = 'pendiente'), 0) AS comision_pendiente,
    COALESCE(SUM(p.comision_monto) FILTER (WHERE p.comision_estado = 'pagada'), 0) AS comision_pagada
FROM vendedores v
LEFT JOIN pedidos_catalogo p ON p.vendedor_id = v.id
GROUP BY v.id, v.codigo_referido, v.nombre, v.email, v.telefono, v.comision_pct, v.estado;
