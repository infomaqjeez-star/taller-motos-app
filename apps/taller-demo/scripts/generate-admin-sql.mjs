#!/usr/bin/env node
/**
 * Genera el SQL para crear el admin. No necesita conexion a Supabase.
 * Ejecutar: node scripts/generate-admin-sql.mjs --password="TuPass"
 */

import bcrypt from "bcryptjs";
import { Secret } from "otpauth";

const args = process.argv.slice(2);
const getArg = (name) => {
  const arg = args.find(a => a.startsWith(`--${name}=`));
  return arg ? arg.split("=")[1] : null;
};

async function main() {
  const nombre = getArg("nombre") || "Admin";
  const email = getArg("email") || "vianferreterias@gmail.com";
  const password = getArg("password") || "";

  if (!password) {
    console.error("Uso: node scripts/generate-admin-sql.mjs --password=\"TuPass\"");
    process.exit(1);
  }

  const secret = new Secret({ size: 20 });
  const passwordHash = await bcrypt.hash(password, 12);

  console.log("-- EJECUTAR ESTO EN SQL EDITOR DE SUPABASE --\n");
  console.log(`INSERT INTO admins_catalogo (nombre, email, password_hash, estado, totp_enabled, totp_secret)`);
  console.log(`VALUES (`);
  console.log(`  '${nombre}',`);
  console.log(`  '${email.toLowerCase()}',`);
  console.log(`  '${passwordHash}',`);
  console.log(`  'activo',`);
  console.log(`  true,`);
  console.log(`  '${secret.base32}'`);
  console.log(`);`);
  console.log(`\n-- Verificar`);
  console.log(`SELECT id, nombre, email, estado, totp_enabled FROM admins_catalogo WHERE email = '${email.toLowerCase()}';`);
  console.log("\n=========================================");
  console.log("CLAVE MANUAL PARA GOOGLE AUTHENTICATOR:");
  console.log(secret.base32);
  console.log("=========================================");
}

main();
