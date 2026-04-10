-- ============================================================
-- CREAR TABLA DE CONFIGURACIÓN - AppJeez Demo
-- Ejecutar este SQL en Supabase SQL Editor
-- ============================================================

-- Tabla para guardar la configuración del negocio
CREATE TABLE IF NOT EXISTS configuracion (
  id TEXT PRIMARY KEY DEFAULT 'default',
  device_types JSONB NOT NULL DEFAULT '[]',
  business_name TEXT NOT NULL DEFAULT 'AppJeez',
  business_slogan TEXT NOT NULL DEFAULT 'Demo para Service Tecnicos',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trigger para updated_at
CREATE TRIGGER update_configuracion_updated_at
  BEFORE UPDATE ON configuracion
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Política RLS
ALTER TABLE configuracion ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access" ON configuracion FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Anon full access" ON configuracion FOR ALL TO anon USING (true) WITH CHECK (true);

-- Insertar configuración por defecto
INSERT INTO configuracion (id, device_types, business_name, business_slogan)
VALUES (
  'default',
  '[
    {"id": "celular", "label": "Celular", "emoji": "📱", "color": "bg-blue-500", "enabled": true},
    {"id": "tablet", "label": "Tablet", "emoji": "📱", "color": "bg-purple-500", "enabled": true},
    {"id": "tv", "label": "TV / Smart", "emoji": "📺", "color": "bg-cyan-500", "enabled": true},
    {"id": "otros", "label": "Otros", "emoji": "🔧", "color": "bg-orange-500", "enabled": true}
  ]'::jsonb,
  'AppJeez',
  'Demo para Service Tecnicos'
)
ON CONFLICT (id) DO NOTHING;

SELECT '✅ Tabla de configuración creada correctamente' as resultado;
