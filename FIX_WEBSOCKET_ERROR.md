# Solución Error WebSocket - Supabase

## Problema Identificado
Las variables de entorno `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY` no están configuradas correctamente. Por eso aparece literalmente "NEXT_PUBLIC_SUPABASE_ANON_KEY" en la URL del WebSocket.

## Solución Paso a Paso

### 1. Editar el archivo `.env.local`

Abre el archivo `.env.local` en la raíz del proyecto y asegúrate de tener estas líneas:

```env
NEXT_PUBLIC_SUPABASE_URL=https://ajhmajacljmccrkehsyy.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-anon-key-real-aqui
```

**IMPORTANTE:**
- Reemplaza `tu-anon-key-real-aqui` con la clave real de tu proyecto Supabase
- Las variables deben empezar con `NEXT_PUBLIC_` para que estén disponibles en el cliente
- No uses comillas alrededor de los valores
- Asegúrate de que no haya espacios al final de las líneas

### 2. Obtener las credenciales de Supabase

1. Ve a tu proyecto en [Supabase Dashboard](https://app.supabase.com)
2. Ve a **Project Settings** → **API**
3. Copia:
   - **URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### 3. Reiniciar el servidor de desarrollo

Después de editar `.env.local`, **DEBES reiniciar el servidor**:

```bash
# Detener el servidor actual (Ctrl+C)
# Luego iniciar de nuevo:
npm run dev
```

⚠️ **Next.js solo carga las variables de entorno al iniciar el servidor.**

### 4. Verificar que funcione

Abre la consola del navegador (F12) y deberías ver:

```
[Supabase Init] {url: '✓ URL configured', key: '✓ Key configured'}
[REALTIME] Iniciando conexión WebSocket...
[REALTIME] Conectado a canal de preguntas (WebSocket OK)
```

Si ves mensajes de error, revisa que las variables estén correctas.

## Qué cambios hice en el código

### 1. `src/lib/supabase.ts`
- Agregué validación en tiempo de ejecución para detectar cuando faltan variables
- Muestra mensajes de error claros en la consola

### 2. `src/components/QuestionAlertGlobal.tsx`
- Agregué función `hasValidSupabaseConfig()` para verificar configuración
- Si no hay credenciales válidas, el sistema usa **solo polling** (sin WebSocket)
- Esto evita errores de conexión innecesarios

## Fallback automático

Si las credenciales no están configuradas, el sistema automáticamente usará **polling cada 10 segundos** en lugar de WebSocket. Esto garantiza que las alertas de preguntas sigan funcionando.

## Notas

- El archivo `.env.local` **NO** debe subirse a GitHub (está en `.gitignore`)
- Cada desarrollador necesita su propio archivo `.env.local`
- En producción (Vercel/Netlify), configura las variables en el panel de la plataforma
