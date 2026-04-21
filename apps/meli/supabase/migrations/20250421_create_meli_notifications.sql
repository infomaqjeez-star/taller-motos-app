-- Tabla para notificaciones en tiempo real de Mercado Libre (Webhooks)
CREATE TABLE IF NOT EXISTS meli_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type VARCHAR(50) NOT NULL, -- 'question', 'message', 'order'
  meli_id VARCHAR(100) NOT NULL,
  account_id UUID REFERENCES linked_meli_accounts(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  data JSONB NOT NULL,
  processed BOOLEAN DEFAULT false,
  processed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Índices para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_meli_notifications_user ON meli_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_meli_notifications_account ON meli_notifications(account_id);
CREATE INDEX IF NOT EXISTS idx_meli_notifications_processed ON meli_notifications(processed);
CREATE INDEX IF NOT EXISTS idx_meli_notifications_created ON meli_notifications(created_at DESC);

-- Trigger para actualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_meli_notifications_updated_at ON meli_notifications;
CREATE TRIGGER update_meli_notifications_updated_at
  BEFORE UPDATE ON meli_notifications
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Políticas de seguridad
ALTER TABLE meli_notifications ENABLE ROW LEVEL SECURITY;

-- Solo el dueño puede ver sus notificaciones
DROP POLICY IF EXISTS meli_notifications_select_policy ON meli_notifications;
CREATE POLICY meli_notifications_select_policy ON meli_notifications
  FOR SELECT USING (auth.uid() = user_id);

-- Solo el sistema puede insertar
DROP POLICY IF EXISTS meli_notifications_insert_policy ON meli_notifications;
CREATE POLICY meli_notifications_insert_policy ON meli_notifications
  FOR INSERT WITH CHECK (true);

-- Solo el dueño puede actualizar
DROP POLICY IF EXISTS meli_notifications_update_policy ON meli_notifications;
CREATE POLICY meli_notifications_update_policy ON meli_notifications
  FOR UPDATE USING (auth.uid() = user_id);
