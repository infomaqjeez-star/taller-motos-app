# 🔐 MaqJeez Multi-Tenant - Implementación Completa

Este documento describe la implementación del modelo multi-tenant donde un usuario de MaqJeez puede vincular múltiples cuentas de Mercado Libre.

## 🏗️ Arquitectura

```
┌─────────────────────────────────────────────────────────────┐
│                    USUARIO MAQJEEZ                          │
│                 (auth.users - Supabase)                     │
│                        (UUID)                               │
└────────────────────┬────────────────────────────────────────┘
                     │
                     │ 1:N
                     ▼
┌─────────────────────────────────────────────────────────────┐
│              LINKED_MELI_ACCOUNTS                           │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │ Cuenta MeLi │  │ Cuenta MeLi │  │ Cuenta MeLi │         │
│  │  @sucursal1 │  │  @sucursal2 │  │  @sucursal3 │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
└─────────────────────────────────────────────────────────────┘
```

## 📁 Archivos Nuevos/Modificados

### 1. Schema SQL
**`supabase/migrations/001_multi_tenant_meli_accounts.sql`**
- Tabla `linked_meli_accounts` con relación 1:N a `auth.users`
- RLS policies para aislamiento de datos
- Funciones:
  - `upsert_linked_meli_account()` - Vincular/actualizar cuenta
  - `deactivate_linked_account()` - Desactivar cuenta
  - `get_accounts_to_refresh()` - Para renovación automática
  - Vista `user_meli_accounts_summary` - Para dashboard

### 2. API Routes

#### `/api/auth/login`
- Recibe `user_id` como query param
- Guarda `user_id` en el `state` de OAuth
- Redirige a MeLi para autorización

#### `/api/auth/callback`
- Recibe callback de MeLi con `code` y `state`
- Extrae `user_id` del `state`
- Intercambia código por tokens
- Obtiene nickname de la cuenta MeLi
- Guarda en `linked_meli_accounts` vinculado al `user_id`

#### `/api/linked-accounts`
- `GET` - Listar cuentas vinculadas de un usuario
- `PATCH` - Desactivar una cuenta
- `DELETE` - Eliminar una cuenta permanentemente

### 3. Frontend
**`/configuracion/meli/page.tsx`**
- Detecta usuario logueado vía Supabase Auth
- Lista cuentas vinculadas con estado de token
- Permite vincular nueva cuenta
- Acciones: Reconectar, Desactivar, Eliminar
- Muestra badges de estado (válido/expirando/expirado)

### 4. Librería
**`src/lib/meli.ts`**
- Funciones nuevas para modelo multi-tenant:
  - `getUserLinkedAccounts(userId)`
  - `getValidTokenForAccount(userId, meliUserId)`
  - `updateLinkedAccountTokens(accountId, tokens)`
  - `processMultipleAccounts()` - Procesar varias cuentas en paralelo
- Mantiene backwards compatibility con funciones legacy

## ⚙️ Variables de Entorno Requeridas

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# MeLi OAuth
NEXT_PUBLIC_MELI_APP_ID=TU_APP_ID
APPJEEZ_MELI_SECRET_KEY=TU_SECRET_KEY
APPJEEZ_MELI_ENCRYPTION_KEY=tu-clave-secreta-min-32-chars!!
MELI_REDIRECT_URI=https://tu-app.com/api/auth/callback
```

## 🚀 Flujo OAuth Completo

```
1. Usuario logueado en MaqJeez (tiene auth.uid())
         │
         ▼
2. Clic "Vincular Cuenta MeLi"
         │
         ▼
3. GET /api/auth/login?user_id=uuid-del-usuario
         │
         ▼
4. Redirect a MeLi OAuth con state=uuid-del-usuario
         │
         ▼
5. Usuario autoriza en MeLi
         │
         ▼
6. Redirect a /api/auth/callback?code=xxx&state=uuid
         │
         ▼
7. Backend intercambia code por tokens
   Obtiene user_id desde state
   Guarda en linked_meli_accounts con user_id
         │
         ▼
8. Redirect a /configuracion/meli?status=success
```

## 🛡️ Seguridad Implementada

### Row Level Security (RLS)
```sql
-- Usuario solo ve sus propias cuentas
CREATE POLICY "owner_manage_own_accounts" ON linked_meli_accounts
  FOR ALL USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
```

### Aislamiento de Datos
- Cada query filtra por `user_id`
- El `service_role_key` solo se usa en backend
- Tokens encriptados con AES-256-GCM
- El `state` de OAuth previene CSRF

### Validaciones
- Verificación de propiedad antes de modificar/eliminar
- Tokens con expiración y auto-renovación
- Un usuario no puede vincular la misma cuenta MeLi dos veces

## 📊 API de Uso

### Vincular Nueva Cuenta
```typescript
// Frontend
const { data: { user } } = await supabase.auth.getUser();
window.location.href = `/api/auth/login?user_id=${user.id}`;
```

### Listar Cuentas Vinculadas
```typescript
const res = await fetch(`/api/linked-accounts?user_id=${userId}`);
const { accounts } = await res.json();
```

### Obtener Token Válido
```typescript
import { getValidTokenForAccount } from "@/lib/meli";

const tokenData = await getValidTokenForAccount(userId, meliUserId);
if (tokenData) {
  const { token, account } = tokenData;
  // Usar token para llamadas a MeLi API
}
```

### Procesar Múltiples Cuentas
```typescript
import { processMultipleAccounts } from "@/lib/meli";

const results = await processMultipleAccounts(
  userId,
  ["123456", "789012"], // meli_user_ids
  async (token, account) => {
    // Procesar cada cuenta
    return await updatePrices(token, newPrices);
  }
);
```

## 🧪 Testing

1. **Crear usuario de prueba:**
   - Registrarse en MaqJeez
   - Obtener UUID del usuario

2. **Vincular cuenta MeLi:**
   - Ir a /configuracion/meli
   - Clic en "Vincular Cuenta MeLi"
   - Completar flujo OAuth
   - Verificar que aparezca en la lista

3. **Verificar RLS:**
   - Intentar acceder a cuentas de otro usuario (debe fallar)
   - Verificar que cada usuario solo ve sus cuentas

4. **Probar renovación:**
   - Esperar a que el token expire
   - Verificar que se renueve automáticamente

## 🔮 Próximos Pasos

1. **Dashboard Multi-Cuenta:**
   - Selector de cuentas para operaciones
   - Vista unificada de todas las sucursales
   - Sincronización en paralelo

2. **Suscripciones por Usuario:**
   - Tabla `subscriptions` vinculada a `auth.users`
   - Límites de cuentas vinculadas según plan

3. **Roles y Permisos:**
   - Admin puede ver todas las cuentas
   - Usuario solo ve las suyas

## 📚 Documentación Relacionada

- `docs/OAUTH_SETUP.md` - Configuración inicial OAuth
- `supabase/migrations/001_multi_tenant_meli_accounts.sql` - Schema completo
