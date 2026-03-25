-- ============================================================
-- SCHEMA — Taller MAQJEEZ
-- Ejecutar en: Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- Tabla principal de reparaciones (órdenes de trabajo)
CREATE TABLE IF NOT EXISTS reparaciones (
  id                  TEXT PRIMARY KEY,
  client_name         TEXT NOT NULL,
  client_phone        TEXT NOT NULL,
  motor_type          TEXT NOT NULL CHECK (motor_type IN ('2T', '4T')),
  brand               TEXT NOT NULL,
  model               TEXT NOT NULL,
  reported_issues     TEXT NOT NULL DEFAULT '',
  budget              NUMERIC,
  estimated_days      INTEGER,
  status              TEXT NOT NULL DEFAULT 'ingresado',
  client_notification TEXT NOT NULL DEFAULT 'pendiente_de_aviso',
  budget_accepted     BOOLEAN NOT NULL DEFAULT FALSE,
  entry_date          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completion_date     TIMESTAMPTZ,
  delivery_date       TIMESTAMPTZ,
  linked_parts        TEXT[] DEFAULT '{}',
  internal_notes      TEXT NOT NULL DEFAULT '',
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

-- Stock de repuestos
CREATE TABLE IF NOT EXISTS stock (
  id           TEXT PRIMARY KEY,
  name         TEXT NOT NULL,
  quantity     INTEGER NOT NULL DEFAULT 0,
  location     TEXT NOT NULL DEFAULT '',
  min_quantity INTEGER NOT NULL DEFAULT 1,
  notes        TEXT NOT NULL DEFAULT '',
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- Repuestos a pedir
CREATE TABLE IF NOT EXISTS repuestos_a_pedir (
  id                 TEXT PRIMARY KEY,
  name               TEXT NOT NULL,
  quantity           INTEGER NOT NULL DEFAULT 1,
  order_id           TEXT REFERENCES reparaciones(id) ON DELETE SET NULL,
  order_client_name  TEXT,
  supplier           TEXT NOT NULL DEFAULT '',
  status             TEXT NOT NULL DEFAULT 'pendiente',
  notes              TEXT NOT NULL DEFAULT '',
  created_at         TIMESTAMPTZ DEFAULT NOW()
);

-- Historial de notificaciones WhatsApp
CREATE TABLE IF NOT EXISTS notificaciones_enviadas (
  id           TEXT PRIMARY KEY,
  order_id     TEXT REFERENCES reparaciones(id) ON DELETE CASCADE,
  client_name  TEXT NOT NULL,
  client_phone TEXT NOT NULL,
  type         TEXT NOT NULL,
  message      TEXT NOT NULL,
  sent_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Habilitar Row Level Security (lectura/escritura libre para anon key en MVP)
ALTER TABLE reparaciones          ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE repuestos_a_pedir     ENABLE ROW LEVEL SECURITY;
ALTER TABLE notificaciones_enviadas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "allow_all_reparaciones"           ON reparaciones           FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_stock"                  ON stock                  FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_repuestos_a_pedir"      ON repuestos_a_pedir      FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_notificaciones_enviadas" ON notificaciones_enviadas FOR ALL USING (true) WITH CHECK (true);
