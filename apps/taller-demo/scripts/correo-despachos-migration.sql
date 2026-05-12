-- Tabla para despachos diarios de Correo Argentino
CREATE TABLE IF NOT EXISTS correo_despachos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fecha DATE NOT NULL DEFAULT CURRENT_DATE,
  archivo_url TEXT,
  archivo_tipo TEXT CHECK (archivo_tipo IN ('imagen', 'pdf')),
  notas TEXT DEFAULT '',
  cantidad_envios INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índice para búsqueda por fecha
CREATE INDEX IF NOT EXISTS idx_correo_despachos_fecha ON correo_despachos (fecha DESC);

-- Política RLS: permitir todo con service role (la API usa service key)
ALTER TABLE correo_despachos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for service role" ON correo_despachos FOR ALL USING (true) WITH CHECK (true);
