-- Agregar columnas avatar_url y device_id a mensajes_taller
-- Ejecutar en Supabase SQL Editor

ALTER TABLE mensajes_taller
  ADD COLUMN IF NOT EXISTS avatar_url TEXT,
  ADD COLUMN IF NOT EXISTS device_id TEXT;
