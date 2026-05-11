import bcrypt from "bcryptjs";
import { Secret } from "otpauth";

const password = "Eze12ar43215g";
const email = "vianferreterias@gmail.com";
const nombre = "Admin";

const hash = await bcrypt.hash(password, 12);
const secret = new Secret({ size: 20 });

console.log("-- SQL PARA SUPABASE --");
console.log(`INSERT INTO admins_catalogo (nombre, email, password_hash, estado, totp_enabled, totp_secret)`);
console.log(`VALUES ('${nombre}', '${email}', '${hash}', 'activo', true, '${secret.base32}');`);
console.log("");
console.log("-- Verificar --");
console.log(`SELECT id, nombre, email, estado, totp_enabled FROM admins_catalogo WHERE email = '${email}';`);
console.log("");
console.log("=== CLAVE PARA GOOGLE AUTHENTICATOR ===");
console.log(secret.base32);
console.log("========================================");
