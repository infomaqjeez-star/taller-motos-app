-- 1. Tabla para sincronizar preguntas en tiempo real (Caché)
CREATE TABLE IF NOT EXISTS meli_questions_sync (
  id TEXT PRIMARY KEY, -- ID de la pregunta de MeLi
  user_id UUID NOT NULL REFERENCES auth.users(id), -- Usuario MaqJeez dueño
  meli_user_id TEXT NOT NULL, -- Cuenta MeLi donde entró
  item_id TEXT NOT NULL, -- Producto asociado
  title_item TEXT, -- Título del producto (para UI)
  item_thumbnail TEXT, -- Thumbnail del producto
  question_text TEXT NOT NULL, -- Texto de la pregunta
  status TEXT NOT NULL, -- UNANSWERED, ANSWERED
  buyer_nickname TEXT, -- Nombre del comprador
  meli_created_date TIMESTAMPTZ NOT NULL, -- Fecha original de MeLi
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- RLS: Seguridad multi-inquilino
  UNIQUE(user_id, id)
);

-- Habilitar RLS
ALTER TABLE meli_questions_sync ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY IF NOT EXISTS "Usuarios gestionan sus propias preguntas sincronizadas"
  ON meli_questions_sync USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Índices para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_meli_questions_user_status 
  ON meli_questions_sync(user_id, status);
CREATE INDEX IF NOT EXISTS idx_meli_questions_item 
  ON meli_questions_sync(item_id);
CREATE INDEX IF NOT EXISTS idx_meli_questions_created 
  ON meli_questions_sync(meli_created_date DESC);

-- 2. Tabla Base de Conocimiento por Producto (Historial de Respuestas)
CREATE TABLE IF NOT EXISTS product_knowledge_base (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id), -- Usuario dueño del conocimiento
  item_id TEXT NOT NULL, -- Vinculado a un ítem específico de MeLi
  question_keywords TEXT NOT NULL, -- Palabras clave o pregunta tipo
  answer_text TEXT NOT NULL, -- La respuesta perfecta guardada
  use_count INT DEFAULT 1, -- Cuántas veces se usó esta respuesta
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- RLS: Seguridad multi-inquilino
  UNIQUE(user_id, item_id, question_keywords)
);

ALTER TABLE product_knowledge_base ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Usuarios gestionan su propia base de conocimiento"
  ON product_knowledge_base USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Índices para búsquedas
CREATE INDEX IF NOT EXISTS idx_knowledge_base_user_item 
  ON product_knowledge_base(user_id, item_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_base_keywords 
  ON product_knowledge_base USING gin(to_tsvector('spanish', question_keywords));

-- 3. Trigger para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER IF NOT EXISTS update_meli_questions_sync_updated_at 
  BEFORE UPDATE ON meli_questions_sync 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER IF NOT EXISTS update_knowledge_base_updated_at 
  BEFORE UPDATE ON product_knowledge_base 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
