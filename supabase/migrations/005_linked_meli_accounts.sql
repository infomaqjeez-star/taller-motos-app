-- ============================================================
-- Tabla de cuentas de Mercado Libre vinculadas (Multi-tenant)
-- Ejecutar en: Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- 1. Tabla para guardar MÚLTIPLES cuentas de MeLi vinculadas a UN usuario
CREATE TABLE IF NOT EXISTS linked_meli_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  meli_user_id TEXT NOT NULL,
  meli_nickname TEXT NOT NULL,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  token_expiry_date TIMESTAMPTZ NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Un usuario no puede vincular la misma cuenta MeLi dos veces
  UNIQUE(user_id, meli_user_id)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_linked_meli_accounts_user_id ON linked_meli_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_linked_meli_accounts_meli_user_id ON linked_meli_accounts(meli_user_id);
CREATE INDEX IF NOT EXISTS idx_linked_meli_accounts_active ON linked_meli_accounts(user_id, is_active);

-- 2. Habilitar RLS (Row Level Security)
ALTER TABLE linked_meli_accounts ENABLE ROW LEVEL SECURITY;

-- 3. Políticas de RLS - Un usuario solo gestiona sus propias cuentas

-- SELECT: Usuario solo ve sus propias cuentas
DROP POLICY IF EXISTS "Users view own meli accounts" ON linked_meli_accounts;
CREATE POLICY "Users view own meli accounts" ON linked_meli_accounts
  FOR SELECT USING (user_id = auth.uid());

-- INSERT: Usuario solo puede insertar para sí mismo
DROP POLICY IF EXISTS "Users insert own meli accounts" ON linked_meli_accounts;
CREATE POLICY "Users insert own meli accounts" ON linked_meli_accounts
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- UPDATE: Usuario solo puede actualizar sus propias cuentas
DROP POLICY IF EXISTS "Users update own meli accounts" ON linked_meli_accounts;
CREATE POLICY "Users update own meli accounts" ON linked_meli_accounts
  FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- DELETE: Usuario solo puede eliminar sus propias cuentas
DROP POLICY IF EXISTS "Users delete own meli accounts" ON linked_meli_accounts;
CREATE POLICY "Users delete own meli accounts" ON linked_meli_accounts
  FOR DELETE USING (user_id = auth.uid());

-- 4. Función para actualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para updated_at
DROP TRIGGER IF EXISTS update_linked_meli_accounts_updated_at ON linked_meli_accounts;
CREATE TRIGGER update_linked_meli_accounts_updated_at
  BEFORE UPDATE ON linked_meli_accounts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 5. Comentario
COMMENT ON TABLE linked_meli_accounts IS 'Cuentas de Mercado Libre vinculadas a usuarios de MaqJeez (multi-tenant)';
