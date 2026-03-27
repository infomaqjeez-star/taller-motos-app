-- Ejecutar en Supabase SQL Editor
-- Tabla de logs para el módulo de promociones automáticas

CREATE TABLE IF NOT EXISTS meli_promotions_log (
  id                    uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  meli_user_id          text,
  account               text,
  item_id               text,
  item_title            text,
  promotion_id          text,
  promotion_type        text,
  requested_discount_pct numeric(5,2),
  max_allowed_pct       numeric(5,2),
  action                text CHECK (action IN ('accepted', 'skipped', 'error')),
  reason                text,
  created_at            timestamptz DEFAULT now()
);

-- Índices para consultas rápidas
CREATE INDEX IF NOT EXISTS idx_promo_log_created  ON meli_promotions_log (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_promo_log_action   ON meli_promotions_log (action);
CREATE INDEX IF NOT EXISTS idx_promo_log_account  ON meli_promotions_log (account);

-- RLS básico (ajustar según necesidad)
ALTER TABLE meli_promotions_log ENABLE ROW LEVEL SECURITY;
