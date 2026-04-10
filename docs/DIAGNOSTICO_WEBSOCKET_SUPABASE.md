# 🔧 Diagnóstico de Error WebSocket - Supabase Realtime

## Error Reportado
```
NS_ERROR_WEBSOCKET_CONNECTION_REFUSED
wss://ajhmajaclimccrkehsyy.supabase.co/realtime/v1/websocket

Cookie '__cf_bm' rechazada por dominio no válido
```

---

## ✅ Soluciones Implementadas

### 1. **Sistema de Fallback Automático**
- Si WebSocket no se conecta en 5 segundos, el sistema activa **Polling cada 10 segundos**
- Las alertas de preguntas seguirán funcionando, solo que con más latencia
- Logs mejorados para diagnosticar qué está pasando

### 2. **Configuración de Supabase Mejorada**
- Realtime config optimizada con `eventsPerSecond: 10`
- Mejor manejo de estados de conexión
- Logs informativos sobre conectividad

### 3. **CSP Headers** (Ya configurado en `next.config.js`)
```
connect-src 'self' https://ajhmajaclimccrkehsyy.supabase.co wss://ajhmajaclimccrkehsyy.supabase.co
```

---

## 🔍 Checklist para Verificar en Supabase

### **Paso 1: Verificar que el Proyecto NO está pausado**

1. Entra a [supabase.com](https://supabase.com)
2. Ve a tu proyecto `taller-motos-app`
3. Mira la esquina superior derecha: ¿Dice "Paused" o "Active"?
4. Si está **Paused**:
   - Click en el proyecto → Settings → General
   - Busca "Pause project" → Click "Resume"
   - Espera 30-60 segundos a que se reactive

### **Paso 2: Verificar Site URL en Authentication Settings**

1. Dashboard de Supabase → Authentication → URL Configuration
2. **Site URL** debe ser: `https://taller-motos-app-production.up.railway.app`
3. Si está diferente, actualiza:
   - Click en "Edit" o "Update"
   - Pegá la URL correcta de Railway
   - Guarda

### **Paso 3: Verificar que Realtime está Habilitado**

1. Dashboard → Project Settings → API
2. En la sección "Realtime" debería estar **visible y activo**
3. Si no ves esa sección, tu plan puede que no incluya Realtime

### **Paso 4: Revisar Logs en Railway (Si hay errores del lado del servidor)**

1. Ve a [railway.app](https://railway.app)
2. Tu proyecto: `taller-motos-app`
3. Pestaña "Deployments" → Click en el deployment más reciente
4. Busca logs con `[Supabase]`, `[REALTIME]`, o `[FALLBACK]`
5. Si ves `[FALLBACK POLL]` significa que WebSocket no funcionó pero polling está activo

### **Paso 5: Probar Conexión en Navegador (F12 Console)**

Abre la consola de Firefox/Chrome (F12) y busca estos logs:

✅ **Si Realtime funciona:**
```
[REALTIME] Iniciando conexión WebSocket...
✅ [REALTIME] Conectado a canal de preguntas (WebSocket OK)
```

⚠️ **Si cae a Polling:**
```
[REALTIME] Iniciando conexión WebSocket...
[FALLBACK] Realtime no respondió en 5s. Activando polling como fallback...
[FALLBACK POLL] Verificando nuevas preguntas...
```

---

## 🛠️ Posibles Causas Raíz

| Causa | Síntoma | Solución |
|-------|---------|----------|
| **Proyecto pausado** | Error `NS_ERROR_WEBSOCKET_CONNECTION_REFUSED` inmediatamente | Resume el proyecto en Settings |
| **Site URL incorrecta** | Cookie Cloudflare rechazada | Actualiza Site URL en Auth Settings |
| **Firewall/Adblocker** | Solo en ciertos navegadores | Desactiva extensiones, prueba en incógnito |
| **Plan gratuito (inactivo 1 semana)** | WebSocket rechazado | Accede al dashboard una vez por semana |
| **CORS bloqueado** | Error en `OPTIONS` request | Verificá que Railway URL está en Supabase allowlist |

---

## 📊 Plan de Acción Inmediata

### **Si Realtime NO funciona:**

1. ✅ Verifica que proyecto esté **Active** (no Paused)
2. ✅ Verifica que Site URL sea correcta
3. ✅ Espera 5 segundos → Sistema activará Polling automáticamente
4. ✅ **Entra una pregunta de prueba** en MeLi → Verá la alerta (aunque con 10s de latencia)

### **Si aún no funcionan las alertas:**

- Revisa console del navegador: ¿Ves `[FALLBACK POLL]`?
  - **SÍ**: Fallback está activo, issue es solo latencia. Funciona.
  - **NO**: Error más profundo. Revisar logs de Railway.

---

## 🚀 Pasos para Forzar Recarga

```bash
# En tu máquina local (Windows PowerShell):
cd "C:\Users\Mi Pc\Downloads\APP PARA TALLER MAQJEEZ"

# Fuerza redeploy en Railway
git commit --allow-empty -m "chore: forzar diagnóstico WebSocket"
git push

# Espera a que Railway redeploy (1-2 minutos)
# Luego abre la app en navegador y revisa console (F12)
```

---

## 📋 Resumen Técnico

| Componente | Status | Acción |
|---|---|---|
| **WebSocket (Realtime)** | ❓ En Diagnóstico | Ver logs de console F12 |
| **Fallback Polling** | ✅ Activo | Cada 10s si Realtime falla |
| **CSP Headers** | ✅ Configurado | Permite wss:// en Railway |
| **Site URL** | ❓ Requiere verificación | Debe ser URL de Railway |
| **Proyecto Supabase** | ❓ Requiere verificación | ¿Está en estado Active? |

---

## 💬 Próximos Pasos

1. **Verifica los 5 pasos arriba** ⬆️
2. **Revisa console del navegador** (F12) después de recargar
3. **Prueba entrar una pregunta de prueba** en MeLi
4. **Si ves logs de [FALLBACK POLL]** = Sistema funciona con polling (latencia ~10s)
5. **Si ves [REALTIME] Conectado** = WebSocket OK (latencia ~100ms)

---

**Última actualización:** 2026-03-31
**Versión de Fix:** WebSocket + Fallback Polling v1.0
