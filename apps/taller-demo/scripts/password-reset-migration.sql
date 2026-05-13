-- Tabla de tokens de reset de contraseña
-- Aplica para clientes, vendedores y admins
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token       TEXT UNIQUE NOT NULL,
  email       TEXT NOT NULL,
  rol         TEXT NOT NULL CHECK (rol IN ('cliente', 'vendedor', 'admin')),
  used        BOOLEAN DEFAULT FALSE,
  expires_at  TIMESTAMPTZ NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_prt_token ON password_reset_tokens(token);
CREATE INDEX IF NOT EXISTS idx_prt_email ON password_reset_tokens(email);

-- Limpiar tokens expirados automáticamente (opcional, se puede correr periódicamente)
-- DELETE FROM password_reset_tokens WHERE expires_at < NOW();
