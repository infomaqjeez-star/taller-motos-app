-- Ejecutar en Supabase SQL Editor
-- Agrega columnas de metadata a meli_printed_labels para el historial

ALTER TABLE meli_printed_labels
  ADD COLUMN IF NOT EXISTS account    text,
  ADD COLUMN IF NOT EXISTS type       text,
  ADD COLUMN IF NOT EXISTS buyer      text,
  ADD COLUMN IF NOT EXISTS title      text,
  ADD COLUMN IF NOT EXISTS printed_at timestamptz DEFAULT now();

-- Índice para ordenar historial por fecha
CREATE INDEX IF NOT EXISTS idx_meli_printed_labels_printed_at
  ON meli_printed_labels (printed_at DESC);
