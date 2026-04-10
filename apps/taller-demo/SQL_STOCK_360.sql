-- ============================================================
-- MÓDULO DE STOCK 360° - AppJeez
-- Sistema completo de inventario con reservas y trazabilidad
-- ============================================================

-- 1. Actualizar tabla stock con nuevos campos
ALTER TABLE stock 
ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'repuesto' CHECK (category IN ('repuesto', 'articulo', 'ambos')),
ADD COLUMN IF NOT EXISTS reserved_quantity INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS cost_price INTEGER,
ADD COLUMN IF NOT EXISTS qr_code TEXT;

-- 2. Crear tabla de reservas de stock
CREATE TABLE IF NOT EXISTS stock_reservations (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  stock_id TEXT NOT NULL REFERENCES stock(id) ON DELETE CASCADE,
  order_id TEXT NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  status TEXT NOT NULL DEFAULT 'reserved' CHECK (status IN ('reserved', 'consumed', 'released')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ
);

-- 3. Crear índices para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_stock_reservations_stock_id ON stock_reservations(stock_id);
CREATE INDEX IF NOT EXISTS idx_stock_reservations_order_id ON stock_reservations(order_id);
CREATE INDEX IF NOT EXISTS idx_stock_reservations_status ON stock_reservations(status);
CREATE INDEX IF NOT EXISTS idx_stock_category ON stock(category);

-- 4. Función para validar stock disponible antes de reservar
CREATE OR REPLACE FUNCTION check_stock_availability()
RETURNS TRIGGER AS $$
BEGIN
  IF (SELECT (quantity - reserved_quantity) < NEW.quantity 
      FROM stock WHERE id = NEW.stock_id) THEN
    RAISE EXCEPTION 'Stock insuficiente para reservar';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5. Trigger para validar disponibilidad
DROP TRIGGER IF EXISTS trg_check_stock_availability ON stock_reservations;
CREATE TRIGGER trg_check_stock_availability
  BEFORE INSERT ON stock_reservations
  FOR EACH ROW
  WHEN (NEW.status = 'reserved')
  EXECUTE FUNCTION check_stock_availability();

-- 6. Función para actualizar stock reservado automáticamente
CREATE OR REPLACE FUNCTION update_reserved_quantity()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'reserved' AND (OLD.status IS NULL OR OLD.status != 'reserved') THEN
    -- Sumar al reservado
    UPDATE stock SET reserved_quantity = reserved_quantity + NEW.quantity 
    WHERE id = NEW.stock_id;
  ELSIF NEW.status != 'reserved' AND OLD.status = 'reserved' THEN
    -- Restar del reservado
    UPDATE stock SET reserved_quantity = GREATEST(0, reserved_quantity - NEW.quantity)
    WHERE id = NEW.stock_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 7. Trigger para mantener sincronizado el stock reservado
DROP TRIGGER IF EXISTS trg_update_reserved_quantity ON stock_reservations;
CREATE TRIGGER trg_update_reserved_quantity
  AFTER INSERT OR UPDATE ON stock_reservations
  FOR EACH ROW
  EXECUTE FUNCTION update_reserved_quantity();

-- 8. Políticas RLS para stock_reservations
ALTER TABLE stock_reservations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all operations on stock_reservations" 
ON stock_reservations FOR ALL 
USING (true) WITH CHECK (true);

-- 9. Vista para stock disponible (cantidad - reservado)
CREATE OR REPLACE VIEW stock_available AS
SELECT 
  s.*,
  (s.quantity - s.reserved_quantity) as available_quantity,
  CASE 
    WHEN (s.quantity - s.reserved_quantity) <= 0 THEN 'agotado'
    WHEN (s.quantity - s.reserved_quantity) <= 2 THEN 'critico'
    WHEN (s.quantity - s.reserved_quantity) <= s.min_quantity THEN 'bajo'
    ELSE 'normal'
  END as stock_status
FROM stock s
WHERE s.is_active = true;

-- 10. Mensaje de confirmación
SELECT '✅ Módulo de Stock 360° configurado correctamente' as status;
SELECT '✅ Tabla stock actualizada con categorías y reservas' as status;
SELECT '✅ Tabla stock_reservations creada' as status;
SELECT '✅ Funciones de validación y sincronización activadas' as status;
SELECT '✅ Vista stock_available creada para consultas rápidas' as status;
