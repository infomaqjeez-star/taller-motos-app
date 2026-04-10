# Prompt para Verdent - Lógica Multi-Usuario Multi-Cuenta (1:N)

## Contexto
MaqJeez ahora es una plataforma multi-tenant donde:
- Un usuario de MaqJeez (auth.users) puede tener N cuentas de MeLi vinculadas
- Cada cuenta está en la tabla `linked_meli_accounts`
- Los datos están aislados por `user_id` mediante RLS

## Directivas para Operaciones con MeLi

### 1. Recibir Parámetros Obligatorios
Toda función que ejecute operaciones en MeLi DEBE recibir:
- `user_id`: UUID del usuario MaqJeez (desde su sesión)
- `selected_meli_user_ids`: Array de strings con los IDs de MeLi seleccionados

```typescript
interface MeliOperationRequest {
  user_id: string;                    // UUID del usuario MaqJeez
  selected_meli_user_ids: string[];   // IDs de cuentas MeLi a afectar
  // ... otros parámetros específicos
}
```

### 2. Validar Permisos
Antes de cualquier operación:
```typescript
// Verificar que el usuario está autenticado
const { data: { user } } = await supabase.auth.getUser();
if (!user || user.id !== request.user_id) {
  throw new Error("Unauthorized: User ID mismatch");
}
```

### 3. Iterar sobre Cuentas Seleccionadas
```typescript
import { processMultipleAccounts } from "@/lib/meli";

const results = await processMultipleAccounts(
  request.user_id,
  request.selected_meli_user_ids,
  async (token, account) => {
    // 'account' es LinkedMeliAccount con:
    // - id, user_id, meli_user_id, meli_nickname
    // - access_token_enc, refresh_token_enc, token_expiry_date
    
    return await executeMeliOperation(token, account);
  }
);
```

### 4. Obtener Tokens Válidos (Auto-Renewal)
```typescript
import { getValidTokenForAccount } from "@/lib/meli";

// Esta función automáticamente:
// 1. Busca la cuenta en linked_meli_accounts
// 2. Verifica que pertenezca al user_id
// 3. Verifica que is_active = true
// 4. Renueva el token si está expirado
// 5. Actualiza la BD con los nuevos tokens
// 6. Retorna el token válido

const tokenData = await getValidTokenForAccount(userId, meliUserId);
if (!tokenData) {
  throw new Error(`No valid token for account ${meliUserId}`);
}
const { token, account } = tokenData;
```

### 5. Llamadas a API de MeLi
```typescript
import { meliGet, meliGetWithRetry } from "@/lib/meli";

// GET simple
const userData = await meliGet(`/users/${account.meli_user_id}`, token);

// Con retry automático
const items = await meliGetWithRetry(
  `/users/${account.meli_user_id}/items/search`,
  token,
  2,      // retries
  1000    // delay base
);
```

### 6. Estructura de Respuesta
Siempre retornar resultados por cuenta:
```typescript
interface OperationResult {
  [meliUserId: string]: {
    success: boolean;
    data?: any;
    error?: string;
    accountNickname?: string;
  }
}

// Ejemplo:
{
  "123456789": {
    success: true,
    data: { updated: 42 },
    accountNickname: "@mitienda"
  },
  "987654321": {
    success: false,
    error: "Token expired and refresh failed",
    accountNickname: "@misucursal2"
  }
}
```

### 7. Manejo de Errores
```typescript
try {
  const result = await meliOperation(token);
  return { success: true, data: result };
} catch (error) {
  // Si es error de token, intentar una vez más con refresh forzado
  if (error.message?.includes("401") || error.message?.includes("403")) {
    const newToken = await forceTokenRefresh(account);
    if (newToken) {
      const result = await meliOperation(newToken);
      return { success: true, data: result };
    }
  }
  return { success: false, error: error.message };
}
```

### 8. Operaciones en Paralelo (Batch)
Para operaciones masivas, usar Promise.all con límite:
```typescript
import pLimit from 'p-limit';

const limit = pLimit(3); // Máximo 3 concurrentes

const results = await Promise.all(
  request.selected_meli_user_ids.map(meliUserId =>
    limit(async () => {
      try {
        const tokenData = await getValidTokenForAccount(userId, meliUserId);
        if (!tokenData) return { meliUserId, error: "No token" };
        
        const result = await operation(tokenData.token);
        return { meliUserId, success: true, result };
      } catch (err) {
        return { meliUserId, error: err.message };
      }
    })
  )
);
```

## Ejemplo Completo: Actualización Masiva de Precios

```typescript
// src/app/api/batch-update-prices/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getValidTokenForAccount, meliGet } from "@/lib/meli";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { user_id, selected_meli_user_ids, price_updates } = body;

    // Validar
    if (!user_id || !selected_meli_user_ids?.length) {
      return NextResponse.json(
        { error: "Missing user_id or selected accounts" },
        { status: 400 }
      );
    }

    const results: Record<string, any> = {};

    // Procesar cada cuenta
    for (const meliUserId of selected_meli_user_ids) {
      try {
        // 1. Obtener token válido (con auto-renewal)
        const tokenData = await getValidTokenForAccount(user_id, meliUserId);
        if (!tokenData) {
          results[meliUserId] = {
            success: false,
            error: "No valid token available"
          };
          continue;
        }

        const { token, account } = tokenData;

        // 2. Ejecutar operación
        const updateResults = [];
        for (const update of price_updates) {
          const res = await fetch(
            `https://api.mercadolibre.com/items/${update.item_id}`,
            {
              method: "PUT",
              headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json"
              },
              body: JSON.stringify({ price: update.new_price })
            }
          );
          updateResults.push({
            item_id: update.item_id,
            success: res.ok,
            status: res.status
          });
        }

        results[meliUserId] = {
          success: true,
          account_nickname: account.meli_nickname,
          updates: updateResults
        };

      } catch (err) {
        results[meliUserId] = {
          success: false,
          error: (err as Error).message
        };
      }
    }

    return NextResponse.json({ results });

  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 }
    );
  }
}
```

## Reglas de Oro

1. **NUNCA** exponer tokens en el frontend
2. **SIEMPRE** validar que el user_id coincide con la sesión
3. **SIEMPRE** usar `getValidTokenForAccount()` para obtener tokens
4. **NUNCA** guardar tokens en texto plano
5. **SIEMPRE** manejar errores por cuenta individual
6. **SIEMPRE** respetar los límites de rate de MeLi API

## Schema de Base de Datos (Referencia)

```sql
-- Tabla principal
linked_meli_accounts
  - id: uuid (PK)
  - user_id: uuid (FK auth.users.id)
  - meli_user_id: text
  - meli_nickname: text
  - access_token_enc: text (AES-256-GCM)
  - refresh_token_enc: text (AES-256-GCM)
  - token_expiry_date: timestamptz
  - is_active: boolean
  - created_at, updated_at: timestamptz

-- Política RLS
CREATE POLICY "owner_manage_own_accounts" ON linked_meli_accounts
  FOR ALL USING (user_id = auth.uid());
```
