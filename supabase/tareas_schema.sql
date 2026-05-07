-- Tabla de tareas para asignar a empleados
CREATE TABLE IF NOT EXISTS tareas (
  id TEXT PRIMARY KEY,
  titulo TEXT NOT NULL,
  descripcion TEXT NOT NULL,
  asignado_a TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pendiente', 'en_progreso', 'completada')),
  creada_en TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  creador TEXT NOT NULL DEFAULT 'admin',
  password TEXT NOT NULL DEFAULT 'admin',
  tiempo_estimado INTEGER NOT NULL DEFAULT 0,
  tiempo_real INTEGER,
  iniciada_en TIMESTAMP WITH TIME ZONE,
  iniciador TEXT,
  completada_en TIMESTAMP WITH TIME ZONE,
  completador TEXT,
  vista BOOLEAN NOT NULL DEFAULT FALSE,
  prioridad TEXT NOT NULL CHECK (prioridad IN ('baja', 'media', 'alta')) DEFAULT 'media',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Índices para mejorar rendimiento
CREATE INDEX IF NOT EXISTS idx_tareas_asignado_a ON tareas(asignado_a);
CREATE INDEX IF NOT EXISTS idx_tareas_status ON tareas(status);
CREATE INDEX IF NOT EXISTS idx_tareas_vista ON tareas(vista);
CREATE INDEX IF NOT EXISTS idx_tareas_creada_en ON tareas(creada_en DESC);
CREATE INDEX IF NOT EXISTS idx_tareas_creador ON tareas(creador);
CREATE INDEX IF NOT EXISTS idx_tareas_iniciador ON tareas(iniciador);
CREATE INDEX IF NOT EXISTS idx_tareas_completador ON tareas(completador);

-- Trigger para actualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_tareas_updated_at
  BEFORE UPDATE ON tareas
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Agregar columnas si no existen (para migraciones)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tareas' AND column_name = 'creador') THEN
    ALTER TABLE tareas ADD COLUMN creador TEXT NOT NULL DEFAULT 'admin';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tareas' AND column_name = 'password') THEN
    ALTER TABLE tareas ADD COLUMN password TEXT NOT NULL DEFAULT 'admin';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tareas' AND column_name = 'tiempo_estimado') THEN
    ALTER TABLE tareas ADD COLUMN tiempo_estimado INTEGER NOT NULL DEFAULT 0;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tareas' AND column_name = 'tiempo_real') THEN
    ALTER TABLE tareas ADD COLUMN tiempo_real INTEGER;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tareas' AND column_name = 'iniciador') THEN
    ALTER TABLE tareas ADD COLUMN iniciador TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tareas' AND column_name = 'completador') THEN
    ALTER TABLE tareas ADD COLUMN completador TEXT;
  END IF;
END $$;
