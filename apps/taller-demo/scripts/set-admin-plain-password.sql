-- ACTUALIZAR contraseña del admin a TEXTO PLANO (temporal para desbloqueo)
-- DESPUES de loguear, cambiala desde el panel de admin a una contraseña hasheada
UPDATE admins_catalogo
SET password_hash = 'Eze12ar43215g'
WHERE email = 'vianferreterias@gmail.com';

-- Verificar
SELECT id, nombre, email, estado, totp_enabled,
  CASE
    WHEN password_hash LIKE '$2%' THEN 'bcrypt-hash'
    ELSE 'plain-text'
  END as password_type
FROM admins_catalogo
WHERE email = 'vianferreterias@gmail.com';
