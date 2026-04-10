-- Agregar columna foto_url a flex_envios (para vincular foto de comprobante)
ALTER TABLE flex_envios ADD COLUMN IF NOT EXISTS foto_url TEXT DEFAULT '';
