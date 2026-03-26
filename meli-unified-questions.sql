-- ══════════════════════════════════════════════════════════════
-- APPJEEZ — Centro de Mensajería Unificado
-- Ejecutar en Supabase SQL Editor
-- ══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.meli_unified_questions (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  meli_question_id  BIGINT      UNIQUE NOT NULL,
  meli_account_id   UUID        REFERENCES public.meli_accounts(id) ON DELETE CASCADE,
  item_id           TEXT,
  item_title        TEXT,
  buyer_id          BIGINT,
  buyer_nickname    TEXT,
  question_text     TEXT        NOT NULL,
  status            TEXT        NOT NULL DEFAULT 'UNANSWERED',
  date_created      TIMESTAMPTZ,
  answer_text       TEXT,
  answer_date       TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices para consultas rápidas
CREATE INDEX IF NOT EXISTS idx_meli_uq_status          ON public.meli_unified_questions(status);
CREATE INDEX IF NOT EXISTS idx_meli_uq_account         ON public.meli_unified_questions(meli_account_id);
CREATE INDEX IF NOT EXISTS idx_meli_uq_date            ON public.meli_unified_questions(date_created DESC);

-- RLS
ALTER TABLE public.meli_unified_questions ENABLE ROW LEVEL SECURITY;

-- Solo service_role puede leer/escribir (las Edge Functions usan service_role)
CREATE POLICY "service_role_all" ON public.meli_unified_questions
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Trigger updated_at
CREATE OR REPLACE FUNCTION update_meli_uq_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS trg_meli_uq_updated_at ON public.meli_unified_questions;
CREATE TRIGGER trg_meli_uq_updated_at
  BEFORE UPDATE ON public.meli_unified_questions
  FOR EACH ROW EXECUTE FUNCTION update_meli_uq_updated_at();
