-- Agregar columnas seña y total pagado
ALTER TABLE reparaciones
  ADD COLUMN IF NOT EXISTS deposit    NUMERIC,
  ADD COLUMN IF NOT EXISTS total_paid NUMERIC;
