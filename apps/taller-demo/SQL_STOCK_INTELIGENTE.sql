-- ============================================================
-- MÓDULO DE STOCK INTELIGENTE - AppJeez
-- Actualización de tabla stock con SKU automático y fotos
-- ============================================================

-- 1. Agregar campos nuevos a la tabla stock existente
ALTER TABLE stock 
ADD COLUMN IF NOT EXISTS sku TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS description TEXT DEFAULT '',
ADD COLUMN IF NOT EXISTS price INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS supplier TEXT DEFAULT '',
ADD COLUMN IF NOT EXISTS photo_url TEXT,
ADD COLUMN IF NOT EXISTS min_stock INTEGER DEFAULT 3,
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;

-- 2. Crear función para generar SKU automático
CREATE OR REPLACE FUNCTION generate_sku()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.sku IS NULL THEN
    NEW.sku := 'AJ-' || LPAD((
      SELECT COALESCE(MAX(NULLIF(REGEXP_REPLACE(sku, '[^0-9]', '', 'g'), ''))::INTEGER, 0) + 1
      FROM stock
    )::TEXT, 4, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Crear trigger para generar SKU automáticamente
DROP TRIGGER IF EXISTS trigger_generate_sku ON stock;
CREATE TRIGGER trigger_generate_sku
  BEFORE INSERT ON stock
  FOR EACH ROW
  EXECUTE FUNCTION generate_sku();

-- 4. Crear índice para búsqueda rápida
CREATE INDEX IF NOT EXISTS idx_stock_name ON stock(name);
CREATE INDEX IF NOT EXISTS idx_stock_sku ON stock(sku);
CREATE INDEX IF NOT EXISTS idx_stock_active ON stock(is_active) WHERE is_active = TRUE;

-- 5. Crear tabla de historial de movimientos de stock
CREATE TABLE IF NOT EXISTS stock_movements (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  stock_id TEXT REFERENCES stock(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('entry', 'exit', 'adjustment')),
  quantity INTEGER NOT NULL,
  previous_quantity INTEGER NOT NULL,
  new_quantity INTEGER NOT NULL,
  reference_type TEXT, -- 'sale', 'purchase', 'adjustment'
  reference_id TEXT,
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by TEXT DEFAULT 'system'
);

-- 6. Políticas RLS para stock_movements
ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all operations on stock_movements" 
ON stock_movements FOR ALL 
USING (true) WITH CHECK (true);

-- 7. Función para registrar movimiento de stock automáticamente
CREATE OR REPLACE FUNCTION log_stock_movement()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.quantity != OLD.quantity THEN
    INSERT INTO stock_movements (
      stock_id,
      type,
      quantity,
      previous_quantity,
      new_quantity,
      reference_type,
      notes
    ) VALUES (
      NEW.id,
      CASE 
        WHEN NEW.quantity > OLD.quantity THEN 'entry'
        ELSE 'exit'
      END,
      ABS(NEW.quantity - OLD.quantity),
      OLD.quantity,
      NEW.quantity,
      'adjustment',
      'Cambio de cantidad manual'
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 8. Trigger para registrar movimientos
DROP TRIGGER IF EXISTS trigger_log_stock_movement ON stock;
CREATE TRIGGER trigger_log_stock_movement
  AFTER UPDATE ON stock
  FOR EACH ROW
  WHEN (OLD.quantity IS DISTINCT FROM NEW.quantity)
  EXECUTE FUNCTION log_stock_movement();

-- 9. Mensaje de confirmación
SELECT '✅ Módulo de Stock Inteligente configurado correctamente' as status;
SELECT '✅ Campos agregados: sku, description, price, supplier, photo_url, min_stock, is_active' as status;
SELECT '✅ Tabla stock_movements creada para historial' as status;
SELECT '✅ Funciones y triggers para SKU automático activados' as status;
