-- Tabla para historial de etiquetas (60 días)
CREATE TABLE IF NOT EXISTS etiquetas_historial (
    id SERIAL PRIMARY KEY,
    order_id VARCHAR(50) NOT NULL UNIQUE,
    shipping_id VARCHAR(50) NOT NULL,
    cuenta_origen VARCHAR(100),
    comprador_nombre VARCHAR(150),
    titulo_producto TEXT,
    tipo_envio VARCHAR(20),
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    pdf_generado BOOLEAN DEFAULT false
);

-- Índice para búsquedas rápidas por fecha
CREATE INDEX IF NOT EXISTS idx_etiquetas_fecha ON etiquetas_historial(fecha_creacion);

-- Índice para búsquedas por cuenta
CREATE INDEX IF NOT EXISTS idx_etiquetas_cuenta ON etiquetas_historial(cuenta_origen);

-- Función para limpiar registros antiguos (más de 60 días)
CREATE OR REPLACE FUNCTION limpiar_etiquetas_antiguas()
RETURNS void AS $$
BEGIN
    DELETE FROM etiquetas_historial 
    WHERE fecha_creacion < NOW() - INTERVAL '60 days';
END;
$$ LANGUAGE plpgsql;
