-- Migracion: clientes por DNI + tabla notificaciones + vincular pedidos

-- 1. Agregar dni a clientes_catalogo (si no existe)
ALTER TABLE clientes_catalogo 
ADD COLUMN IF NOT EXISTS dni text,
ADD COLUMN IF NOT EXISTS vendedor_referente_id uuid REFERENCES vendedores(id);

-- Indices para busqueda rapida
CREATE INDEX IF NOT EXISTS idx_clientes_dni ON clientes_catalogo(dni);
CREATE INDEX IF NOT EXISTS idx_clientes_telefono ON clientes_catalogo(telefono);
CREATE INDEX IF NOT EXISTS idx_clientes_vendedor ON clientes_catalogo(vendedor_referente_id);

-- 2. Crear tabla de notificaciones
CREATE TABLE IF NOT EXISTS notificaciones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo text NOT NULL, -- 'cambio_vendedor', 'nuevo_cliente', 'nuevo_pedido', etc
  titulo text NOT NULL,
  mensaje text NOT NULL,
  destinatario_rol text NOT NULL, -- 'admin', 'vendedor', 'cliente'
  destinatario_id uuid, -- ID del vendedor o admin especifico
  leido boolean DEFAULT false,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notificaciones_dest ON notificaciones(destinatario_rol, destinatario_id, leido);
CREATE INDEX IF NOT EXISTS idx_notificaciones_created ON notificaciones(created_at DESC);

-- 3. Verificar que todo quedo bien
SELECT 'clientes_catalogo columnas' as info;
SELECT column_name FROM information_schema.columns WHERE table_name = 'clientes_catalogo' AND table_schema = 'public' ORDER BY ordinal_position;

SELECT 'notificaciones columnas' as info;
SELECT column_name FROM information_schema.columns WHERE table_name = 'notificaciones' AND table_schema = 'public' ORDER BY ordinal_position;
