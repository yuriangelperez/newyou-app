# Plan de implementación: Notificaciones de publicaciones y pedidos

**Rama**: `feature/notifications` · **Spec**: [spec.md](spec.md)

## Resumen

Notificaciones locales con `expo-notifications` para el recordatorio de publicación y push de Expo
para los pedidos, disparadas desde PostgreSQL con un trigger y `pg_net`, sin servidor propio.

## Contexto técnico

- **Lenguaje**: TypeScript estricto · **Framework**: Expo SDK 57 + Expo Router
- **Dependencias nuevas**: `expo-notifications`, `expo-device` (con `npx expo install`)
- **Almacenamiento**: AsyncStorage para el mapa prenda → id de notificación y el token local; tabla `push_tokens` en Supabase
- **Pruebas**: Jest con `expo-notifications` mockeado; push probado a mano con dos builds de EAS
- **Plataformas**: Android e iOS; en la web las funciones no hacen nada
- **Restricciones**: el push no funciona en Expo Go (requiere build de EAS)

## Chequeo de la constitución

| Principio | Cumple | Cómo |
| --- | --- | --- |
| I. Spec antes que código | ✅ | esta carpeta |
| II. Stack fijo | ✅ | módulos de Expo, servicios en `services/`, hook en `hooks/` |
| III. Seguridad | ✅ | `push_tokens` con RLS; envío desde una función `SECURITY DEFINER` sin permisos para clientes |
| IV. Calidad | ✅ | `__tests__/notificaciones.test.ts`, escenarios `TC-PUSH-*` en Gherkin y RTM |
| V. Accesibilidad y web | ✅ | interruptor con `testID`; guardas `Platform.OS !== 'web'` |

## Estructura

```text
services/notificacionesService.ts   handler a nivel módulo, canal Android, programar y cancelar
services/pushService.ts             registrar y desregistrar el token de Expo
hooks/useNotifications.ts           permiso al publicar + recordatorio
hooks/usePushNotifications.ts       interruptor de Ajustes
app/producto/nuevo.tsx              llama a recordarPublicacion tras crear
services/productosService.ts        deleteProducto cancela el recordatorio
app/ajustes.tsx                     interruptor "Notificaciones push"
app/_layout.tsx                     al tocar una notificación abre la pantalla
app/(tabs)/perfil.tsx               cerrar sesión borra el token
supabase/migraciones/14-push-tokens.sql   tabla, RPC y trigger con pg_net
```

## Decisiones

- **Trigger en `pedido_eventos`** en lugar de una Edge Function: cada alta o cambio de estado ya
  inserta un evento, así que un solo trigger cubre ventas nuevas y cambios de estado.
- **RPC `registrar_push_token`** en lugar de `upsert`: si el token era de otra cuenta, RLS impediría
  actualizarlo.
