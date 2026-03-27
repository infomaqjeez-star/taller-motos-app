-- ============================================================
-- PASO 1: Crear el bucket (ejecutar SOLO si no existe ya)
-- En Supabase Dashboard: Storage → New bucket → nombre: fotos-maquinas → marcar "Public bucket" → Create
-- ============================================================

-- PASO 2: Políticas de acceso para el bucket fotos-maquinas
-- Ejecutar este SQL en el SQL Editor de Supabase

-- Permitir subir fotos (INSERT) a usuarios autenticados y anónimos
INSERT INTO storage.buckets (id, name, public)
VALUES ('fotos-maquinas', 'fotos-maquinas', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Política: cualquiera puede LEER las fotos (acceso público)
CREATE POLICY "Fotos públicas - lectura"
ON storage.objects FOR SELECT
USING (bucket_id = 'fotos-maquinas');

-- Política: cualquiera puede SUBIR fotos
CREATE POLICY "Fotos - subida libre"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'fotos-maquinas');

-- Política: cualquiera puede BORRAR fotos
CREATE POLICY "Fotos - borrar"
ON storage.objects FOR DELETE
USING (bucket_id = 'fotos-maquinas');
