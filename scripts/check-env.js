/**
 * Verificación de variables de entorno de Supabase
 * Ejecutar con: node scripts/check-env.js
 */

const requiredVars = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY'
];

console.log('🔍 Verificando variables de entorno de Supabase...\n');

let allOk = true;

for (const varName of requiredVars) {
  const value = process.env[varName];
  if (value && value.trim() !== '' && !value.includes('tu_')) {
    console.log(`✅ ${varName}: Configurada correctamente`);
    // Mostrar solo los primeros 20 caracteros para verificación
    console.log(`   Valor: ${value.substring(0, 20)}...`);
  } else {
    console.log(`❌ ${varName}: NO CONFIGURADA o tiene valor de placeholder`);
    allOk = false;
  }
}

console.log('\n' + (allOk ? '✅ Todas las variables están configuradas' : '❌ Faltan variables por configurar'));

if (!allOk) {
  console.log('\n📋 Instrucciones:');
  console.log('1. Crea o edita el archivo .env.local en la raíz del proyecto');
  console.log('2. Agrega las siguientes líneas:');
  console.log('   NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co');
  console.log('   NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-anon-key-aqui');
  console.log('3. Reinicia el servidor de desarrollo (npm run dev)');
  process.exit(1);
}
