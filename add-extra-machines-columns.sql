-- Agregar columnas para múltiples máquinas por orden
ALTER TABLE reparaciones
  ADD COLUMN IF NOT EXISTS extra_machines     JSONB    NOT NULL DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS machine_type_other TEXT;
