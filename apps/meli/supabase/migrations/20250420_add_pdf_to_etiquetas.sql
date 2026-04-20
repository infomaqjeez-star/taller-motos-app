-- Agregar columna para almacenar el PDF de la etiqueta
ALTER TABLE etiquetas_historial 
ADD COLUMN IF NOT EXISTS pdf_data BYTEA,
ADD COLUMN IF NOT EXISTS pdf_url TEXT,
ADD COLUMN IF NOT EXISTS pdf_guardado_en TIMESTAMP,
ADD COLUMN IF NOT EXISTS meli_account_id VARCHAR(50);

-- Índice para búsquedas por shipping_id
CREATE INDEX IF NOT EXISTS idx_etiquetas_shipping ON etiquetas_historial(shipping_id);

-- Comentario explicativo
COMMENT ON COLUMN etiquetas_historial.pdf_data IS 'PDF de la etiqueta descargado de MeLi (backup permanente)';
COMMENT ON COLUMN etiquetas_historial.pdf_url IS 'URL temporal si se almacena en storage';
