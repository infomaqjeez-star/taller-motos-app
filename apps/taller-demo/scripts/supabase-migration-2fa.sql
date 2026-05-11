-- Migracion: Agregar columnas 2FA a la tabla admins_catalogo
-- Ejecutar en SQL Editor de Supabase (New Query → Run)

ALTER TABLE admins_catalogo
ADD COLUMN IF NOT EXISTS totp_enabled boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS totp_secret text;

-- Verificar
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'admins_catalogo';
