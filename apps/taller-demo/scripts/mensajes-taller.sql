-- Tabla de mensajería instantánea del taller (estilo MSN Messenger)
-- Todos los usuarios del taller ven los mismos mensajes en tiempo real

CREATE TABLE IF NOT EXISTS mensajes_taller (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  autor TEXT NOT NULL,           -- nombre del usuario que escribe
  contenido TEXT NOT NULL,       -- cuerpo del mensaje
  leido BOOLEAN DEFAULT FALSE,   -- true cuando AL MENOS un usuario lo abrió
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índice para ordenar por fecha (más reciente primero)
CREATE INDEX IF NOT EXISTS idx_mensajes_created_at ON mensajes_taller(created_at DESC);

-- Índice para contar no leídos rápido
CREATE INDEX IF NOT EXISTS idx_mensajes_leido ON mensajes_taller(leido) WHERE leido = FALSE;

-- Política RLS: cualquiera puede leer/insertar (el taller es uso interno)
ALTER TABLE mensajes_taller ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all" ON mensajes_taller
  FOR ALL USING (true) WITH CHECK (true);
