# 🔐 OAuth2 Multi-Usuario - Configuración

Este documento describe los pasos para configurar el flujo OAuth2 multi-usuario de MaqJeez.

## 📋 Resumen

El sistema OAuth2 permite que **cualquier vendedor de Mercado Libre** se conecte a MaqJeez de forma segura. Los tokens se almacenan encriptados en Supabase y cada usuario solo puede acceder a sus propios datos.

## 🚀 Paso 1: Configurar en Portal de Desarrolladores de MeLi

1. Ir a: https://developers.mercadolibre.com.ar/apps/
2. Seleccionar tu aplicación (o crear una nueva)
3. Configurar la **Redirect URI**:
   ```
   https://web-production-86c137.up.railway.app/api/auth/callback
   ```
   > ⚠️ **IMPORTANTE**: Reemplaza con tu URL real de Railway/Hostinger

4. Guardar los cambios

## 🗄️ Paso 2: Verificar Schema de Supabase

El schema debería estar ya aplicado. Verifica que tengas:

- Tabla `meli_accounts` con las columnas:
  - `meli_user_id` (bigint, PRIMARY KEY)
  - `nickname` (text)
  - `access_token_enc` (text)
  - `refresh_token_enc` (text)
  - `expires_at` (timestamptz)
  - `status` (text)

- Función `upsert_meli_account()` para guardar/actualizar cuentas
- Políticas RLS activadas

## ⚙️ Paso 3: Variables de Entorno

Asegúrate de tener estas variables configuradas en Railway/Vercel:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# MeLi OAuth
NEXT_PUBLIC_MELI_APP_ID=TU_APP_ID
APPJEEZ_MELI_SECRET_KEY=TU_SECRET_KEY
APPJEEZ_MELI_ENCRYPTION_KEY=tu-clave-secreta-32-chars!

# Callback URL
MELI_REDIRECT_URI=https://tu-app.railway.app/api/auth/callback
```

> 🔑 **Generar APPJEEZ_MELI_ENCRYPTION_KEY**: Usa una clave de al menos 32 caracteres.
> Ejemplo: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`

## 🧪 Paso 4: Probar el Flujo

1. Ir a `/configuracion/meli`
2. Clic en "Autorizar con Mercado Libre"
3. Completar el flujo de MeLi
4. Verificar que la cuenta aparezca en "Cuentas Conectadas"

## 🔄 Flujo Técnico

```
┌─────────────┐     ┌──────────────┐     ┌─────────────────┐
│   Usuario   │────>│  /api/auth/  │────>│  MeLi OAuth     │
│   (Clic)    │     │    login     │     │  (autoriza)     │
└─────────────┘     └──────────────┘     └─────────────────┘
                                                │
                                                ▼
┌─────────────┐     ┌──────────────┐     ┌─────────────────┐
│  Dashboard  │<────│/api/auth/    │<────│  MeLi redirige  │
│  (éxito)    │     │   callback    │     │  con código     │
└─────────────┘     └──────────────┘     └─────────────────┘
                            │
                            ▼
                     ┌──────────────┐
                     │  Intercambia │
                     │  código por  │
                     │   tokens     │
                     └──────────────┘
                            │
                            ▼
                     ┌──────────────┐
                     │   Guarda en  │
                     │   Supabase   │
                     │  (encriptado)│
                     └──────────────┘
```

## 🔒 Seguridad

- Los tokens se encriptan con **AES-256-GCM**
- Las claves de encriptación nunca salen del servidor
- El `service_role_key` solo se usa en API routes del backend
- RLS asegura aislamiento de datos entre usuarios

## 🛠️ Troubleshooting

### Error "No se proporcionó código"
- Verifica que la Redirect URI en MeLi coincida exactamente con `MELI_REDIRECT_URI`

### Error "Missing config"
- Verifica que todas las variables de entorno estén configuradas

### Error al guardar en BD
- Verifica que la función `upsert_meli_account` exista en Supabase
- Revisa los logs de la API route

## 📚 Archivos Relacionados

- `src/app/api/auth/login/route.ts` - Inicia OAuth
- `src/app/api/auth/callback/route.ts` - Recibe callback
- `src/app/configuracion/meli/page.tsx` - UI de configuración
- `src/lib/meli.ts` - Funciones de token y API
