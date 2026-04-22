-- Tabla para historial de etiquetas impresas
CREATE TABLE IF NOT EXISTS label_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  account_id UUID REFERENCES linked_meli_accounts(id) ON DELETE SET NULL,
  shipment_id BIGINT NOT NULL,
  order_id BIGINT,
  tracking_number TEXT,
  label_url TEXT, -- URL del PDF/ZPL
  label_format TEXT DEFAULT 'pdf', -- 'pdf' | 'zpl'
  printed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  printed_by UUID REFERENCES auth.users(id),
  reprint_count INTEGER DEFAULT 0,
  account_nickname TEXT,
  buyer_name TEXT,
  buyer_nickname TEXT,
  item_title TEXT,
  item_thumbnail TEXT,
  total_amount DECIMAL(10,2),
  shipping_cost DECIMAL(10,2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_label_history_user_id ON label_history(user_id);
CREATE INDEX IF NOT EXISTS idx_label_history_account_id ON label_history(account_id);
CREATE INDEX IF NOT EXISTS idx_label_history_shipment_id ON label_history(shipment_id);
CREATE INDEX IF NOT EXISTS idx_label_history_printed_at ON label_history(printed_at DESC);
CREATE INDEX IF NOT EXISTS idx_label_history_tracking ON label_history(tracking_number);

-- Trigger para actualizar updated_at
CREATE OR REPLACE FUNCTION update_label_history_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_label_history ON label_history;
CREATE TRIGGER trigger_update_label_history
  BEFORE UPDATE ON label_history
  FOR EACH ROW
  EXECUTE FUNCTION update_label_history_updated_at();

-- Políticas de seguridad RLS
ALTER TABLE label_history ENABLE ROW LEVEL SECURITY;

-- Política: usuarios solo ven sus propias etiquetas
CREATE POLICY "Users can only see their own labels" ON label_history
  FOR SELECT USING (user_id = auth.uid());

-- Política: usuarios solo insertan sus propias etiquetas
CREATE POLICY "Users can only insert their own labels" ON label_history
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- Política: usuarios solo actualizan sus propias etiquetas
CREATE POLICY "Users can only update their own labels" ON label_history
  FOR UPDATE USING (user_id = auth.uid());

-- Política: usuarios solo eliminan sus propias etiquetas
CREATE POLICY "Users can only delete their own labels" ON label_history
  FOR DELETE USING (user_id = auth.uid());
