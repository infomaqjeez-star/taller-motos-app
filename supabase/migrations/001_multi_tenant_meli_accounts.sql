-- ============================================================
--  MAQJEEZ MULTI-TENANT — OAuth 2.0 Multi-Cuenta MeLi
--  Modelo: 1 Usuario MaqJeez → N Cuentas MeLi Vinculadas
-- ============================================================

-- ── PARTE 1: Extensiones ─────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── PARTE 2: Tabla de Cuentas MeLi Vinculadas ────────────────
-- Crea tabla nueva (o reemplaza la anterior manteniendo datos si es necesario)
CREATE TABLE IF NOT EXISTS public.linked_meli_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  meli_user_id TEXT NOT NULL,
  meli_nickname TEXT NOT NULL,
  access_token_enc TEXT NOT NULL,
  refresh_token_enc TEXT NOT NULL,
  token_expiry_date TIMESTAMPTZ NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Un usuario no puede vincular la misma cuenta MeLi dos veces
  UNIQUE(user_id, meli_user_id)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_linked_meli_accounts_user_id ON public.linked_meli_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_linked_meli_accounts_meli_user_id ON public.linked_meli_accounts(meli_user_id);
CREATE INDEX IF NOT EXISTS idx_linked_meli_accounts_expiry ON public.linked_meli_accounts(token_expiry_date);
CREATE INDEX IF NOT EXISTS idx_linked_meli_accounts_active ON public.linked_meli_accounts(is_active);

-- ── PARTE 3: Row Level Security (RLS) ────────────────────────
ALTER TABLE public.linked_meli_accounts ENABLE ROW LEVEL SECURITY;

-- Política: service_role tiene acceso total (para Edge Functions/backend)
DROP POLICY IF EXISTS "service_role_full_access" ON public.linked_meli_accounts;
CREATE POLICY "service_role_full_access" ON public.linked_meli_accounts
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Política: Usuario solo ve/modifica SUS propias cuentas
DROP POLICY IF EXISTS "owner_manage_own_accounts" ON public.linked_meli_accounts;
CREATE POLICY "owner_manage_own_accounts" ON public.linked_meli_accounts
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ── PARTE 4: Función Upsert (Vincular/Actualizar Cuenta) ────
CREATE OR REPLACE FUNCTION public.upsert_linked_meli_account(
  p_user_id UUID,
  p_meli_user_id TEXT,
  p_meli_nickname TEXT,
  p_access_token_enc TEXT,
  p_refresh_token_enc TEXT,
  p_token_expiry_date TIMESTAMPTZ
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_account_id UUID;
BEGIN
  INSERT INTO public.linked_meli_accounts (
    user_id,
    meli_user_id,
    meli_nickname,
    access_token_enc,
    refresh_token_enc,
    token_expiry_date,
    is_active,
    updated_at
  ) VALUES (
    p_user_id,
    p_meli_user_id,
    p_meli_nickname,
    p_access_token_enc,
    p_refresh_token_enc,
    p_token_expiry_date,
    TRUE,
    NOW()
  )
  ON CONFLICT (user_id, meli_user_id) DO UPDATE SET
    meli_nickname = EXCLUDED.meli_nickname,
    access_token_enc = EXCLUDED.access_token_enc,
    refresh_token_enc = EXCLUDED.refresh_token_enc,
    token_expiry_date = EXCLUDED.token_expiry_date,
    is_active = TRUE,
    updated_at = NOW()
  RETURNING id INTO v_account_id;

  RETURN v_account_id;
END;
$$;

-- ── PARTE 5: Función para Desactivar Cuenta ──────────────────
CREATE OR REPLACE FUNCTION public.deactivate_linked_account(
  p_account_id UUID,
  p_user_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.linked_meli_accounts
  SET is_active = FALSE, updated_at = NOW()
  WHERE id = p_account_id AND user_id = p_user_id;

  RETURN FOUND;
END;
$$;

-- ── PARTE 6: Función para Obtener Cuentas por Vencer ─────────
CREATE OR REPLACE FUNCTION public.get_accounts_to_refresh(
  p_threshold INTERVAL DEFAULT INTERVAL '30 minutes'
)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  meli_user_id TEXT,
  meli_nickname TEXT,
  access_token_enc TEXT,
  refresh_token_enc TEXT,
  token_expiry_date TIMESTAMPTZ
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT 
    id,
    user_id,
    meli_user_id,
    meli_nickname,
    access_token_enc,
    refresh_token_enc,
    token_expiry_date
  FROM public.linked_meli_accounts
  WHERE is_active = TRUE
    AND token_expiry_date <= NOW() + p_threshold;
$$;

-- ── PARTE 7: Trigger para actualizar updated_at ──────────────
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_update_linked_meli_accounts_updated_at ON public.linked_meli_accounts;
CREATE TRIGGER trigger_update_linked_meli_accounts_updated_at
  BEFORE UPDATE ON public.linked_meli_accounts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ── PARTE 8: Vista para el Dashboard (solo metadatos) ───────
CREATE OR REPLACE VIEW public.user_meli_accounts_summary AS
SELECT
  lma.id,
  lma.user_id,
  lma.meli_user_id,
  lma.meli_nickname,
  lma.is_active,
  lma.created_at,
  lma.updated_at,
  CASE 
    WHEN lma.token_expiry_date < NOW() THEN 'expired'
    WHEN lma.token_expiry_date < NOW() + INTERVAL '1 hour' THEN 'expiring_soon'
    ELSE 'valid'
  END as token_status
FROM public.linked_meli_accounts lma
WHERE lma.is_active = TRUE;

-- Permitir acceso a la vista solo a service_role y dueños
ALTER VIEW public.user_meli_accounts_summary OWNER TO postgres;

-- Comentarios para documentación
COMMENT ON TABLE public.linked_meli_accounts IS 'Vinculación entre usuarios MaqJeez y cuentas Mercado Libre';
COMMENT ON COLUMN public.linked_meli_accounts.user_id IS 'ID del usuario en auth.users de Supabase';
COMMENT ON COLUMN public.linked_meli_accounts.meli_user_id IS 'ID único del vendedor en Mercado Libre';
