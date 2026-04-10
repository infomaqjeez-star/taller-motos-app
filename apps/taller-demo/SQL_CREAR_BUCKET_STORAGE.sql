-- ============================================================
-- CREAR BUCKET DE STORAGE PARA FOTOS - AppJeez Demo
-- Ejecutar este SQL en Supabase SQL Editor
-- ============================================================

-- Insertar bucket si not exists
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
SELECT 
  'fotos-maquinas',
  'fotos-maquinas',
  true,
  5242880,
  'image/*'
)
ON CONFLICT (id) DO NOTHING;

-- Crear políticas de acceso
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'fotos-maquinas');

CREATE POLICY "Anon can upload"
ON storage.objects FOR INSERT
TO anon
WITH CHECK (bucket_id = 'fotos-maquinas');

CREATE POLICY "Anon can update"
ON storage.objects FOR UPDATE
TO anon
USING (bucket_id = 'fotos-maquinas');

CREATE POLICY "Anon can delete"
ON storage.objects FOR DELETE
TO anon
USING (bucket_id = 'fotos-maquinas');

SELECT '✅ Bucket creado correctamente' as resultado;
