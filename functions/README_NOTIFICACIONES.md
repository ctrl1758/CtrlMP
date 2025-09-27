# Configuración de Notificaciones Push para el Dueño de la App

## Variables de Entorno Requeridas

Para que el sistema de notificaciones funcione correctamente, debes configurar la siguiente variable de entorno en tu Cloud Function:

### 1. APP_OWNER_EMAIL
- **Nombre:** `APP_OWNER_EMAIL`
- **Valor:** Tu email de login en la app (ej: `tu-email@ejemplo.com`)
- **Descripción:** Esta variable identifica al dueño de la app para enviarle notificaciones push cuando se reciban pagos.

## Cómo Configurar en Firebase Functions

### Opción 1: Firebase CLI
```bash
firebase functions:config:set app.owner_email="tu-email@ejemplo.com"
```

### Opción 2: Firebase Console
1. Ve a [Firebase Console](https://console.firebase.google.com/)
2. Selecciona tu proyecto
3. Ve a Functions > Configuración
4. En la pestaña "Variables de entorno", agrega:
   - **Clave:** `APP_OWNER_EMAIL`
   - **Valor:** `tu-email@ejemplo.com`

### Opción 3: Archivo .env (solo para desarrollo local)
```env
APP_OWNER_EMAIL=tu-email@ejemplo.com
```

## Cómo Funciona el Sistema

1. **Recepción de Pago:** Cuando Mercado Pago envía una notificación IPN de pago aprobado
2. **Búsqueda del Dueño:** El sistema busca en la tabla `profiles` de Supabase usando el email configurado en `APP_OWNER_EMAIL`
3. **Envío de Notificación:** Si se encuentra el perfil y tiene un token de notificación, se envía una notificación push
4. **Mensaje Personalizado:** La notificación incluye el monto recibido y el email del pagador

## Estructura de la Notificación

- **Título:** "¡Recibiste $[MONTO]!"
- **Cuerpo:** "Has recibido una nueva transferencia de [EMAIL_PAGADOR]"
- **Datos adicionales:** `{ type: 'payment_received' }`

## Tabla Supabase Requerida

El sistema espera una tabla `profiles` con la siguiente estructura mínima:

```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  expo_push_token TEXT,
  -- otros campos...
);
```

## Logs del Sistema

El sistema registra todos los eventos importantes:

- ✅ Notificación enviada exitosamente
- ❌ Error al enviar notificación
- 🔔 Usuario sin token de notificación
- ⚠️ Variable de entorno no configurada

## Solución de Problemas

### Error: "La variable de entorno APP_OWNER_EMAIL no está configurada"
- **Solución:** Configura la variable de entorno `APP_OWNER_EMAIL` en tu Cloud Function

### Error: "No se encontró el perfil del dueño"
- **Solución:** Verifica que el email en `APP_OWNER_EMAIL` coincida exactamente con un registro en la tabla `profiles`

### Error: "El dueño no tiene un token de notificación"
- **Solución:** El usuario debe abrir la app para generar un token de notificación válido

## Seguridad

- ✅ El email del dueño se almacena en variables de entorno (no en el código)
- ✅ Solo se envían notificaciones al dueño configurado
- ✅ Se valida la existencia del perfil antes de enviar
- ✅ Se maneja graciosamente la ausencia del token de notificación
