# 🔐 Configuración de Autenticación con Google/Gmail

Este documento describe cómo configurar la autenticación con Google (Gmail) en Supabase para MaqJeez.

## 📋 Resumen

El sistema de autenticación permite a los usuarios:
- Registrarse/iniciar sesión con Google (OAuth)
- Registrarse/iniciar sesión con Email + Contraseña
- Mantener sesión persistente
- Protección de rutas privadas

## ⚙️ Configuración en Supabase

### Paso 1: Ir a Autenticación en Supabase

1. Ve a tu proyecto en [Supabase Dashboard](https://app.supabase.io)
2. Navega a **Authentication** → **Providers**
3. Busca **Google** y haz clic en **Enable**

### Paso 2: Configurar Google OAuth

Necesitas crear credenciales en Google Cloud Console:

1. Ve a [Google Cloud Console](https://console.cloud.google.com/)
2. Crea un nuevo proyecto o selecciona uno existente
3. Ve a **APIs & Services** → **Credentials**
4. Haz clic en **Create Credentials** → **OAuth client ID**
5. Configura la pantalla de consentimiento (si es necesario)
   - Tipo: **External**
   - Nombre de la app: **MaqJeez**
   - Email de soporte: tu email
6. Crea el OAuth client ID:
   - Tipo de aplicación: **Web application**
   - Nombre: **MaqJeez Web**
   - Authorized redirect URIs:
     ```
     https://tu-proyecto.supabase.co/auth/v1/callback
     ```
     (Reemplaza con tu URL de Supabase)
7. Copia el **Client ID** y **Client Secret**

### Paso 3: Configurar en Supabase

1. Vuelve a Supabase → Authentication → Providers → Google
2. Pega el **Client ID** y **Client Secret**
3. En **Redirect URL**, asegúrate de tener:
   ```
   https://tu-proyecto.supabase.co/auth/v1/callback
   ```
4. Guarda los cambios

### Paso 4: Configurar Site URL

1. Ve a **Authentication** → **URL Configuration**
2. En **Site URL**, pon tu dominio:
   ```
   https://tu-app.vercel.app
   ```
   o para desarrollo:
   ```
   http://localhost:3000
   ```
3. En **Redirect URLs**, agrega:
   ```
   https://tu-app.vercel.app/auth/callback
   https://tu-app.vercel.app/login
   ```

## 🧪 Probar la Autenticación

1. Ve a `/login` en tu app
2. Haz clic en "Continuar con Google"
3. Selecciona tu cuenta de Google
4. Deberías ser redirigido al dashboard (`/appjeez`)

## 📁 Archivos Relacionados

| Archivo | Descripción |
|---------|-------------|
| `src/components/auth/AuthProvider.tsx` | Provider de autenticación |
| `src/app/(auth)/login/page.tsx` | Página de login |
| `src/app/(auth)/register/page.tsx` | Página de registro |
| `src/app/auth/callback/page.tsx` | Handler de callback OAuth |
| `src/app/providers.tsx` | Integración con ThemeProvider |

## 🔒 Flujo de Autenticación

```
1. Usuario clic en "Continuar con Google"
         ↓
2. Supabase Auth redirige a Google OAuth
         ↓
3. Usuario autoriza en Google
         ↓
4. Google redirige a Supabase callback
         ↓
5. Supabase crea/actualiza usuario en auth.users
         ↓
6. Supabase redirige a tu app (/auth/callback)
         ↓
7. Tu app verifica sesión y redirige a /appjeez
```

## 📝 Notas Importantes

- Los usuarios se crean automáticamente en la tabla `auth.users`
- El `user_id` (UUID) se usa para vincular cuentas MeLi en `linked_meli_accounts`
- La sesión persiste en localStorage automáticamente
- Usa `supabase.auth.getUser()` para obtener el usuario actual

## 🛠️ Troubleshooting

### Error: "redirect_uri_mismatch"
- Verifica que el redirect URI en Google Cloud Console coincida exactamente con el de Supabase

### Error: "Invalid login credentials"
- Verifica que el Client ID y Client Secret sean correctos
- Asegúrate de que la API de Google+ esté habilitada

### Usuario no redirigido después de login
- Verifica que la URL de callback esté configurada correctamente
- Revisa la consola del navegador por errores

## 🔗 Documentación Oficial

- [Supabase Auth with Google](https://supabase.com/docs/guides/auth/social-login/auth-google)
- [Google OAuth 2.0](https://developers.google.com/identity/protocols/oauth2)
