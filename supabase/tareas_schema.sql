-- Tabla de tareas para asignar a empleados
CREATE TABLE IF NOT EXISTS tareas (
  id TEXT PRIMARY KEY,
  titulo TEXT NOT NULL,
  descripcion TEXT NOT NULL,
  asignado_a TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pendiente', 'en_progreso', 'completada')),
  creada_en TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  iniciada_en TIMESTAMP WITH TIME ZONE,
  completada_en TIMESTAMP WITH TIME ZONE,
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
