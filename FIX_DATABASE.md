# 🔧 FIX: Tablas faltantes en Supabase

## Problema
La app muestra errores porque faltan tablas en la base de datos de Supabase:
- `meli_messages`
- `meli_orders`
- `meli_items`
- `meli_shipments`
- `meli_claims`
- Y otras tablas relacionadas

## Solución

### Paso 1: Ejecutar SQL en Supabase

1. Ve a tu proyecto de Supabase: https://app.supabase.com
2. Selecciona tu proyecto
3. Ve a "SQL Editor" (en el menú lateral)
4. Crea un "New query"
5. Copia y pega el contenido del archivo `scripts/sql/create_missing_tables.sql`
6. Haz clic en "Run" (▶️)

### Paso 2: Verificar que las tablas se crearon

Ejecuta esta consulta para verificar:

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name LIKE 'meli_%';
```

Deberías ver:
- meli_messages
- meli_orders
- meli_items
- meli_shipments
- meli_claims
- meli_unified_questions (ya existía)
- meli_printed_labels (ya existía)

### Paso 3: Reiniciar la app en Railway

Después de crear las tablas, reinicia el servicio en Railway:
1. Ve a https://railway.app
2. Selecciona tu proyecto
3. Haz clic en "Deploy" o espera el redeploy automático

## Archivos creados/modificados

### Nuevos archivos API:
- `src/app/api/meli-dashboard/route.ts`
- `src/app/api/meli-accounts/route.ts`
- `src/app/api/meli-account/[userId]/route.ts`
- `src/app/api/meli-labels/route.ts`
- `src/app/api/meli-labels/search/route.ts`
- `src/app/api/meli-labels/validate/route.ts`
- `src/app/api/meli-labels/save-print-batch/route.ts`
- `src/app/api/meli-labels/download-combined/route.ts`
- `src/app/api/meli-labels/test-print/route.ts`
- `src/app/api/meli-publications/route.ts`
- `src/app/api/promociones-propias/route.ts`
- `src/app/api/meli-promotions/route.ts`
- `src/app/api/meli-price-update/route.ts`
- `src/app/api/meli-sync/auto-sync/route.ts`
- `src/app/api/notifications/stream/route.ts`

### Archivos corregidos:
- `src/hooks/useNotificationStream.ts` - Tipo NodeJS.Timeout
- `src/hooks/useAutoRefresh.ts` - Tipo NodeJS.Timeout
- `src/components/QuestionAlertGlobal.tsx` - Tipo NodeJS.Timeout

## Comandos git para subir cambios

```bash
cd "C:\Users\Usuario\Desktop\APP PARA TALLER MAQJEEZ"
git add .
git commit -m "Fix: Agregar endpoints API y corregir tipos

- Crear todos los endpoints API faltantes para MeLi
- Corregir tipos NodeJS.Timeout en hooks
- Agregar manejo de errores con error.tsx"
git push origin main
```

## Notas importantes

1. **Las tablas nuevas estarán vacías inicialmente** - La app sincronizará los datos automáticamente desde Mercado Libre

2. **RLS está habilitado** - Los usuarios solo pueden ver sus propios datos

3. **Si hay errores de permisos** - Asegúrate de que el Service Role Key tenga acceso a todas las tablas

4. **Webhook de MeLi** - Los webhooks seguirán funcionando y llenarán las tablas automáticamente
