#!/usr/bin/env node
/**
 * Script de setup admin con argumentos (no interactivo):
 *   node scripts/setup-admin-cli.mjs --nombre="Admin" --email="admin@mail.com" --password="contraseña"
 *
 * Requiere en .env.local o variables de entorno:
 *   NEXT_PUBLIC_SUPABASE_URL=...
 *   SUPABASE_SERVICE_ROLE_KEY=...
 */

import { createClient } from "@supabase/supabase-js";
import bcrypt from "bcryptjs";
import { TOTP, Secret } from "otpauth";

const args = process.argv.slice(2);
const getArg = (name) => {
  const arg = args.find(a => a.startsWith(`--${name}=`));
  return arg ? arg.split("=")[1] : null;
};

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    console.error("Faltan variables de entorno: NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY");
    process.exit(1);
  }

  const nombre = getArg("nombre") || "Admin";
  const email = getArg("email") || "";
  const password = getArg("password") || "";

  if (!email || !password) {
    console.error("Uso: node scripts/setup-admin-cli.mjs --nombre=\"Admin\" --email=\"admin@mail.com\" --password=\"contraseña\"");
    process.exit(1);
  }

  if (password.length < 8) {
    console.error("La contraseña debe tener al menos 8 caracteres");
    process.exit(1);
  }

  const supabase = createClient(url, key);

  // Verificar que no haya admins activos
  const { data: existing } = await supabase
    .from("admins_catalogo")
    .select("id")
    .eq("estado", "activo")
    .limit(1);

  if (existing && existing.length > 0) {
    console.error("Ya existe al menos un admin activo.");
    process.exit(1);
  }

  const secret = new Secret({ size: 20 });
  const totp = new TOTP({
    secret: secret.base32,
    digits: 6,
    period: 30,
    issuer: "MaqJeez",
    label: email,
  });

  const passwordHash = await bcrypt.hash(password, 12);

  const { error } = await supabase.from("admins_catalogo").insert({
    nombre,
    email: email.trim().toLowerCase(),
    password_hash: passwordHash,
    estado: "activo",
    totp_enabled: true,
    totp_secret: secret.base32,
  });

  if (error) {
    console.error("Error al crear admin:", error.message);
    process.exit(1);
  }

  console.log("=== Admin creado exitosamente ===");
  console.log(`Email:    ${email}`);
  console.log(`Nombre:   ${nombre}`);
  console.log(`2FA:      Activado`);
  console.log("\n=== CONFIGURAR GOOGLE AUTHENTICATOR ===");
  console.log("1. Abri la app Google Authenticator en tu celular");
  console.log("2. Toca el '+' para agregar cuenta");
  console.log("3. Selecciona 'Ingresar clave de configuracion'");
  console.log(`4. Nombre de cuenta:  ${email}`);
  console.log(`5. Clave:            ${secret.base32}`);
  console.log("6. Tipo de clave:    Base32");
  console.log("7. Digitos:         6");
  console.log("\n=== CODIGO DE PRUEBA ===");
  console.log(`Codigo actual: ${totp.generate()}`);
  console.log("=======================================\n");
}

main();
