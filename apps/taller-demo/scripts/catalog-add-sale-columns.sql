-- ============================================================
-- MIGRACIÓN: Agregar columnas de oferta a catalog_products
-- Ejecutar en Supabase SQL Editor
-- ============================================================

-- Agregar columnas si no existen
ALTER TABLE catalog_products
    ADD COLUMN IF NOT EXISTS discount_price NUMERIC,     -- precio de oferta
    ADD COLUMN IF NOT EXISTS on_sale BOOLEAN DEFAULT false,  -- flag de oferta
    ADD COLUMN IF NOT EXISTS discount_pct NUMERIC DEFAULT 0; -- % de descuento mostrado

-- Índice para búsquedas rápidas de productos en oferta
CREATE INDEX IF NOT EXISTS idx_catalog_on_sale ON catalog_products(on_sale) WHERE on_sale = true;

COMMENT ON COLUMN catalog_products.discount_price IS 'Precio de oferta (descuento)';
COMMENT ON COLUMN catalog_products.on_sale IS 'Flag: true si el producto está en oferta';
COMMENT ON COLUMN catalog_products.discount_pct IS 'Porcentaje de descuento mostrado en UI';
