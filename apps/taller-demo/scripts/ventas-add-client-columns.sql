-- ============================================================
-- MIGRACIÓN: Agregar datos del cliente a ventas_repuestos
-- Ejecutar en Supabase SQL Editor
-- ============================================================

ALTER TABLE ventas_repuestos
    ADD COLUMN IF NOT EXISTS cliente_nombre    TEXT DEFAULT '',
    ADD COLUMN IF NOT EXISTS cliente_dni       TEXT DEFAULT '',
    ADD COLUMN IF NOT EXISTS cliente_direccion TEXT DEFAULT '',
    ADD COLUMN IF NOT EXISTS cliente_telefono  TEXT DEFAULT '';

-- Actualizar ventas existentes para que no sean NULL
UPDATE ventas_repuestos
SET cliente_nombre    = COALESCE(cliente_nombre, ''),
    cliente_dni       = COALESCE(cliente_dni, ''),
    cliente_direccion = COALESCE(cliente_direccion, ''),
    cliente_telefono  = COALESCE(cliente_telefono, '');

SELECT '✅ Columnas de cliente agregadas a ventas_repuestos' as estado;
