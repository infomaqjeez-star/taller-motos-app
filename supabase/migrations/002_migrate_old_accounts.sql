-- ============================================================
--  MIGRACIÓN DE DATOS: meli_accounts → linked_meli_accounts
--  Ejecutar DESPUÉS de crear la tabla linked_meli_accounts
-- ============================================================

-- Verificar que la tabla destino existe
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables 
                 WHERE table_schema = 'public' 
                 AND table_name = 'linked_meli_accounts') THEN
    RAISE EXCEPTION 'La tabla linked_meli_accounts no existe. Ejecuta primero el schema 001_multi_tenant_meli_accounts.sql';
  END IF;
END $$;

-- Insertar datos de la tabla antigua a la nueva
-- Nota: Reemplaza 'TU_USER_ID_AQUI' con el UUID real del usuario
INSERT INTO public.linked_meli_accounts (
  user_id,
  meli_user_id,
  meli_nickname,
  access_token_enc,
  refresh_token_enc,
  token_expiry_date,
  is_active,
  created_at,
  updated_at
)
SELECT 
  'TU_USER_ID_AQUI'::uuid,  -- ⚠️ REEMPLAZAR con el UUID real del usuario
  ma.meli_user_id::text,
  ma.nickname,
  ma.access_token_enc,
  ma.refresh_token_enc,
  ma.expires_at,
  CASE WHEN ma.status = 'active' THEN true ELSE false END,
  ma.created_at,
  ma.updated_at
FROM public.meli_accounts ma
WHERE ma.status = 'active'
  AND NOT EXISTS (
    -- Evitar duplicados
    SELECT 1 FROM public.linked_meli_accounts lma 
    WHERE lma.meli_user_id = ma.meli_user_id::text
  );

-- Verificar cuántas filas se migraron
SELECT 
  'Filas migradas' as info,
  COUNT(*) as cantidad
FROM public.linked_meli_accounts;
