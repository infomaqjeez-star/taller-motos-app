-- ============================================================
-- LOGÍSTICA FLEX — MAQJEEZ
-- Ejecutar en: Supabase Dashboard → SQL Editor → New Query
-- ============================================================

CREATE TABLE IF NOT EXISTS flex_envios (
  id              TEXT PRIMARY KEY,
  fecha           DATE NOT NULL DEFAULT CURRENT_DATE,
  localidad       TEXT NOT NULL,
  zona            TEXT NOT NULL CHECK (zona IN ('cercana', 'media', 'lejana')),
  precio_ml       NUMERIC NOT NULL,
  pago_flete      NUMERIC NOT NULL,
  ganancia        NUMERIC NOT NULL,
  descripcion     TEXT NOT NULL DEFAULT '',
  nro_seguimiento TEXT NOT NULL DEFAULT '',
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE flex_envios ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'flex_envios' AND policyname = 'allow_all_flex'
  ) THEN
    CREATE POLICY "allow_all_flex"
      ON flex_envios FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;
