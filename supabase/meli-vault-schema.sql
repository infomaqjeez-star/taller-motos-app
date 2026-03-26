-- ============================================================
--  APPJEEZ — INTEGRACIÓN OAUTH 2.0 MERCADO LIBRE (BLINDADA)
--  Ejecutar en Supabase SQL Editor en este orden exacto
-- ============================================================

-- ── PARTE 1: Habilitar extensiones ───────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "supabase_vault";

-- ── PARTE 2: Tabla principal meli_accounts ───────────────────
CREATE TABLE IF NOT EXISTS public.meli_accounts (
  id              uuid          DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id         uuid          REFERENCES auth.users(id) ON DELETE CASCADE,
  meli_user_id    bigint        NOT NULL UNIQUE,
  nickname        text,
  -- Los tokens se guardan como IDs de secretos en Vault (no texto plano)
  access_token_id uuid,         -- ID del secreto en vault.secrets
  refresh_token_id uuid,        -- ID del secreto en vault.secrets
  expires_at      timestamptz   NOT NULL,
  status          text          NOT NULL DEFAULT 'active' CHECK (status IN ('active','expired','revoked')),
  created_at      timestamptz   NOT NULL DEFAULT now(),
  updated_at      timestamptz   NOT NULL DEFAULT now()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_meli_accounts_user_id      ON public.meli_accounts (user_id);
CREATE INDEX IF NOT EXISTS idx_meli_accounts_meli_user_id ON public.meli_accounts (meli_user_id);
CREATE INDEX IF NOT EXISTS idx_meli_accounts_expires_at   ON public.meli_accounts (expires_at);

-- ── PARTE 3: RLS ─────────────────────────────────────────────
ALTER TABLE public.meli_accounts ENABLE ROW LEVEL SECURITY;

-- Solo el service_role (Edge Functions) puede operar la tabla
CREATE POLICY "service_role_full_access" ON public.meli_accounts
  FOR ALL
  USING    (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- El dueño autenticado puede VER su propia fila (sin tokens)
CREATE POLICY "owner_can_read" ON public.meli_accounts
  FOR SELECT
  USING (auth.uid() = user_id);

-- ── PARTE 4: View segura (tokens desencriptados solo server-side) ──
-- Esta vista solo es accesible con service_role; expone los tokens
-- desencriptados para las Edge Functions de renovación.
CREATE OR REPLACE VIEW public.meli_accounts_decrypted
WITH (security_invoker = false)
AS
SELECT
  ma.id,
  ma.user_id,
  ma.meli_user_id,
  ma.nickname,
  (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE id = ma.access_token_id)  AS access_token,
  (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE id = ma.refresh_token_id) AS refresh_token,
  ma.expires_at,
  ma.status,
  ma.created_at,
  ma.updated_at
FROM public.meli_accounts ma;

-- Revocar acceso público a la view (solo service_role)
REVOKE ALL ON public.meli_accounts_decrypted FROM anon, authenticated;

-- ── PARTE 5: Función helper para upsert con Vault ────────────
CREATE OR REPLACE FUNCTION public.upsert_meli_account(
  p_meli_user_id  bigint,
  p_nickname      text,
  p_access_token  text,
  p_refresh_token text,
  p_expires_at    timestamptz,
  p_user_id       uuid DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_existing_at_id  uuid;
  v_existing_rt_id  uuid;
  v_at_id           uuid;
  v_rt_id           uuid;
BEGIN
  -- Buscar IDs de secretos existentes
  SELECT access_token_id, refresh_token_id
    INTO v_existing_at_id, v_existing_rt_id
    FROM public.meli_accounts
   WHERE meli_user_id = p_meli_user_id;

  IF v_existing_at_id IS NOT NULL THEN
    -- Actualizar secretos existentes en Vault
    UPDATE vault.secrets SET secret = p_access_token,  updated_at = now() WHERE id = v_existing_at_id;
    UPDATE vault.secrets SET secret = p_refresh_token, updated_at = now() WHERE id = v_existing_rt_id;
    v_at_id := v_existing_at_id;
    v_rt_id := v_existing_rt_id;
  ELSE
    -- Crear nuevos secretos en Vault
    INSERT INTO vault.secrets (secret, name, description)
      VALUES (p_access_token,  'meli_at_'  || p_meli_user_id, 'MeLi access_token')
      RETURNING id INTO v_at_id;

    INSERT INTO vault.secrets (secret, name, description)
      VALUES (p_refresh_token, 'meli_rt_'  || p_meli_user_id, 'MeLi refresh_token')
      RETURNING id INTO v_rt_id;
  END IF;

  -- Upsert en meli_accounts (sin tokens en texto plano)
  INSERT INTO public.meli_accounts
    (meli_user_id, nickname, access_token_id, refresh_token_id, expires_at, status, user_id, updated_at)
  VALUES
    (p_meli_user_id, p_nickname, v_at_id, v_rt_id, p_expires_at, 'active', p_user_id, now())
  ON CONFLICT (meli_user_id) DO UPDATE SET
    nickname         = EXCLUDED.nickname,
    access_token_id  = EXCLUDED.access_token_id,
    refresh_token_id = EXCLUDED.refresh_token_id,
    expires_at       = EXCLUDED.expires_at,
    status           = 'active',
    updated_at       = now();
END;
$$;
