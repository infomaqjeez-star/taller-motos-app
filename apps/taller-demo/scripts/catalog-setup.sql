-- ============================================================
-- SETUP CATÁLOGO MAQJEEZ
-- Ejecutar en Supabase SQL Editor
-- ============================================================

-- 1. Crear tabla de productos del catálogo
CREATE TABLE IF NOT EXISTS catalog_products (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sku         TEXT UNIQUE NOT NULL,
    name        TEXT NOT NULL,
    description TEXT,
    original_price  NUMERIC,          -- precio leído de la imagen
    catalog_price   NUMERIC NOT NULL,  -- precio x4 para el catálogo
    image_url   TEXT,
    category    TEXT DEFAULT 'Repuestos',
    subcategory TEXT,
    brand       TEXT,
    model       TEXT,
    active      BOOLEAN DEFAULT true,
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Índices
CREATE INDEX IF NOT EXISTS idx_catalog_sku     ON catalog_products(sku);
CREATE INDEX IF NOT EXISTS idx_catalog_active  ON catalog_products(active);
CREATE INDEX IF NOT EXISTS idx_catalog_category ON catalog_products(category);

-- 3. Full-text search en nombre (opcional)
CREATE INDEX IF NOT EXISTS idx_catalog_name_fts ON catalog_products
    USING gin(to_tsvector('spanish', name));

-- 4. Trigger para updated_at
CREATE OR REPLACE FUNCTION update_catalog_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_catalog_updated_at ON catalog_products;
CREATE TRIGGER trg_catalog_updated_at
    BEFORE UPDATE ON catalog_products
    FOR EACH ROW EXECUTE FUNCTION update_catalog_updated_at();

-- 5. Políticas RLS (opcional, para seguridad)
ALTER TABLE catalog_products ENABLE ROW LEVEL SECURITY;

-- Política: cualquiera puede leer productos activos
DROP POLICY IF EXISTS catalog_select_public ON catalog_products;
CREATE POLICY catalog_select_public ON catalog_products
    FOR SELECT USING (active = true);

-- Política: solo usuarios autenticados pueden modificar
DROP POLICY IF EXISTS catalog_modify_auth ON catalog_products;
CREATE POLICY catalog_modify_auth ON catalog_products
    FOR ALL USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');
