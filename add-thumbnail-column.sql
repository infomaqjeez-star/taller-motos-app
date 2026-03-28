-- Agregar columna thumbnail a meli_printed_labels
ALTER TABLE meli_printed_labels ADD COLUMN IF NOT EXISTS thumbnail text;
