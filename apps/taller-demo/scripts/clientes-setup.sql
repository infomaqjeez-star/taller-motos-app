-- Tabla de clientes del catálogo
CREATE TABLE IF NOT EXISTS clientes_catalogo (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre       TEXT NOT NULL,
    email        TEXT UNIQUE NOT NULL,
    telefono     TEXT,
    password_hash TEXT NOT NULL,
    codigo_referido TEXT UNIQUE,
    descuento_cliente_pct NUMERIC DEFAULT 3, -- 3% por ser cliente registrado
    estado       TEXT DEFAULT 'activo', -- activo, inactivo
    created_at   TIMESTAMPTZ DEFAULT NOW(),
    updated_at   TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_clientes_email ON clientes_catalogo(email);
CREATE INDEX IF NOT EXISTS idx_clientes_codigo ON clientes_catalogo(codigo_referido);

-- Trigger updated_at
CREATE OR REPLACE FUNCTION update_clientes_catalogo_updated_at()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_clientes_catalogo_updated_at ON clientes_catalogo;
CREATE TRIGGER trg_clientes_catalogo_updated_at
    BEFORE UPDATE ON clientes_catalogo
    FOR EACH ROW EXECUTE FUNCTION update_clientes_catalogo_updated_at();

-- RLS: cualquiera puede leer datos básicos
ALTER TABLE clientes_catalogo ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS clientes_select_public ON clientes_catalogo;
CREATE POLICY clientes_select_public ON clientes_catalogo
    FOR SELECT USING (estado = 'activo');

-- Tabla de carritos abandonados
CREATE TABLE IF NOT EXISTS carritos_abandonados (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cliente_id   UUID REFERENCES clientes_catalogo(id) ON DELETE SET NULL,
    vendedor_id  UUID REFERENCES vendedores(id) ON DELETE SET NULL,
    items        JSONB NOT NULL DEFAULT '[]',
    subtotal     NUMERIC DEFAULT 0,
    total        NUMERIC DEFAULT 0,
    estado       TEXT DEFAULT 'abandonado', -- abandonado, recuperado, convertido
    sesion_id    TEXT,
    user_agent   TEXT,
    ip_address   TEXT,
    created_at   TIMESTAMPTZ DEFAULT NOW(),
    updated_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_carritos_cliente ON carritos_abandonados(cliente_id);
CREATE INDEX IF NOT EXISTS idx_carritos_vendedor ON carritos_abandonados(vendedor_id);
CREATE INDEX IF NOT EXISTS idx_carritos_estado ON carritos_abandonados(estado);

-- Trigger
DROP TRIGGER IF EXISTS trg_carritos_abandonados_updated_at ON carritos_abandonados;
CREATE TRIGGER trg_carritos_abandonados_updated_at
    BEFORE UPDATE ON carritos_abandonados
    FOR EACH ROW EXECUTE FUNCTION update_clientes_catalogo_updated_at();

-- Tabla de pedidos_catalogo (mejorada con estados)
-- Nota: asume que ya existe, solo agregamos columnas si faltan
DO $$ BEGIN
    ALTER TABLE pedidos_catalogo ADD COLUMN IF NOT EXISTS estado TEXT DEFAULT 'pendiente';
    ALTER TABLE pedidos_catalogo ADD COLUMN IF NOT EXISTS estado_pago TEXT DEFAULT 'pendiente';
    ALTER TABLE pedidos_catalogo ADD COLUMN IF NOT EXISTS estado_envio TEXT DEFAULT 'pendiente';
    ALTER TABLE pedidos_catalogo ADD COLUMN IF NOT EXISTS medio_envio TEXT;
    ALTER TABLE pedidos_catalogo ADD COLUMN IF NOT EXISTS tracking TEXT;
    ALTER TABLE pedidos_catalogo ADD COLUMN IF NOT EXISTS fecha_pago TIMESTAMPTZ;
    ALTER TABLE pedidos_catalogo ADD COLUMN IF NOT EXISTS fecha_preparacion TIMESTAMPTZ;
    ALTER TABLE pedidos_catalogo ADD COLUMN IF NOT EXISTS fecha_despacho TIMESTAMPTZ;
    ALTER TABLE pedidos_catalogo ADD COLUMN IF NOT EXISTS fecha_entrega TIMESTAMPTZ;
    ALTER TABLE pedidos_catalogo ADD COLUMN IF NOT EXISTS notas_admin TEXT;
END $$;

-- RLS policies
ALTER TABLE carritos_abandonados ENABLE ROW LEVEL SECURITY;
