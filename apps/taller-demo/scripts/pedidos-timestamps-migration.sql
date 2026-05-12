-- Migración: agregar timestamps de cambio de estado a pedidos_catalogo
-- Ejecutar en Supabase SQL Editor

ALTER TABLE pedidos_catalogo
ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now(),
ADD COLUMN IF NOT EXISTS fecha_confirmado timestamptz DEFAULT null,
ADD COLUMN IF NOT EXISTS fecha_pagado timestamptz DEFAULT null,
ADD COLUMN IF NOT EXISTS fecha_enviado timestamptz DEFAULT null,
ADD COLUMN IF NOT EXISTS fecha_entregado timestamptz DEFAULT null,
ADD COLUMN IF NOT EXISTS fecha_cancelado timestamptz DEFAULT null;

-- Índice para búsquedas por fecha de estado
CREATE INDEX IF NOT EXISTS idx_pedidos_fecha_confirmado ON pedidos_catalogo(fecha_confirmado);
CREATE INDEX IF NOT EXISTS idx_pedidos_fecha_pagado ON pedidos_catalogo(fecha_pagado);
CREATE INDEX IF NOT EXISTS idx_pedidos_fecha_enviado ON pedidos_catalogo(fecha_enviado);
CREATE INDEX IF NOT EXISTS idx_pedidos_fecha_entregado ON pedidos_catalogo(fecha_entregado);
CREATE INDEX IF NOT EXISTS idx_pedidos_fecha_cancelado ON pedidos_catalogo(fecha_cancelado);
