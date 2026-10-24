# Tareas: Notificaciones de publicaciones y pedidos

**Entrada**: [spec.md](spec.md), [plan.md](plan.md) · `[P]` = se puede hacer en paralelo

## Fase 1: Preparación

- [x] T001 Instalar `expo-notifications` y `expo-device` con `npx expo install`
- [x] T002 [P] Plugin `expo-notifications` en `app.json`

## Fase 2: Base

- [x] T003 `services/notificacionesService.ts`: `setNotificationHandler`, canal Android
- [x] T004 Mock de `expo-notifications` en las pruebas

## Fase 3: Historia 1 · Recordatorio al publicar (P1) 🎯 MVP

- [x] T005 [P] [H1] Prueba: programa a 24 h y cancela al borrar (`__tests__/notificaciones.test.ts`)
- [x] T006 [H1] `programarRecordatorioPublicacion` y `cancelarRecordatorioPublicacion`
- [x] T007 [H1] `hooks/useNotifications.ts` con `usePermission`
- [x] T008 [H1] Llamar al publicar (`app/producto/nuevo.tsx`) y cancelar en `deleteProducto`

## Fase 4: Historias 2 y 3 · Push de pedidos (P2)

- [x] T009 [H2] Migración `14-push-tokens.sql`: tabla con RLS y `registrar_push_token`
- [x] T010 [H2] `services/pushService.ts` y `hooks/usePushNotifications.ts`
- [x] T011 [H2] Interruptor en `app/ajustes.tsx`
- [x] T012 [H2] [H3] Trigger `notificar_evento_pedido` con `pg_net`
- [x] T013 [H2] [H3] Abrir "Mis ventas" o "Mis compras" al tocar la notificación
- [x] T014 [H3] Borrar el token al cerrar sesión

## Fase 5: Cierre

- [x] T015 [P] Escenarios `TC-PUSH-*` en `docs/testing/features/05-pedidos-notificaciones.feature` y la RTM
- [ ] T016 Probar con dos celulares con el `.apk` de preview y grabar el video del PR
- [ ] T017 Correr la migración 14 en Supabase (habilitar `pg_net` antes)
