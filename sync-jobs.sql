-- Tabla para tracking de jobs de sincronización automática
-- Ejecutar en Supabase SQL Editor

CREATE TABLE IF NOT EXISTS sync_jobs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at    TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at    TIMESTAMP WITH TIME ZONE DEFAULT now(),
  status        TEXT NOT NULL DEFAULT 'running',
  -- running | stopping | paused | done | error
  mode          TEXT NOT NULL DEFAULT 'all',
  -- all | new_only
  origin_id     TEXT,
  dest_id       TEXT,
  checkpoint    JSONB DEFAULT '{}',
  -- { pairs_done: [...], current_pair: "...", items_done: [...] }
  summary       JSONB DEFAULT '{}',
  -- { cloned: 0, skipped: 0, errors: 0 }
  error_log     JSONB DEFAULT '[]',
  -- [{ item_id, title, reason_code, reason_human, suggestion }]
  logs          TEXT[] DEFAULT ARRAY[]::TEXT[]
);

-- Índice para búsquedas por estado
CREATE INDEX IF NOT EXISTS idx_sync_jobs_status ON sync_jobs(status);
CREATE INDEX IF NOT EXISTS idx_sync_jobs_created ON sync_jobs(created_at DESC);
