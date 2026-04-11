-- Función para desencriptar token de MeLi
-- Ejecutar en Supabase SQL Editor

CREATE OR REPLACE FUNCTION public.decrypt_meli_token(p_encrypted_token TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_decrypted TEXT;
  v_key BYTEA;
  v_salt BYTEA := 'appjeez-meli-salt'::bytea;
  v_iterations INTEGER := 100000;
BEGIN
  -- Esta es una función placeholder - la desencriptación real requiere
  -- algoritmos que no están disponibles en PostgreSQL nativo
  -- Por ahora, retornamos el token tal cual (asumiendo que no está encriptado)
  -- o usamos pgcrypto si está disponible
  
  -- Si pgcrypto está disponible, podemos intentar desencriptar
  -- pero AES-GCM no es soportado directamente por pgcrypto
  
  -- Por ahora, retornamos el input (para testing)
  RETURN p_encrypted_token;
END;
$$;

-- Alternativa: crear una función que obtenga el token directamente
-- sin desencriptación (solo para desarrollo/testing)
CREATE OR REPLACE FUNCTION public.get_meli_token_plain(p_account_id UUID)
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT access_token_enc 
  FROM public.linked_meli_accounts 
  WHERE id = p_account_id AND is_active = true;
$$;
