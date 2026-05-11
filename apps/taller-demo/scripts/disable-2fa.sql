-- DESACTIVAR 2FA del admin para poder entrar sin Google Authenticator
UPDATE admins_catalogo
SET totp_enabled = false,
    totp_secret = NULL
WHERE email = 'vianferreterias@gmail.com';

-- Verificar
SELECT id, nombre, email, estado, totp_enabled, totp_secret 
FROM admins_catalogo 
WHERE email = 'vianferreterias@gmail.com';
