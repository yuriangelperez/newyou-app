# Especificación: Notificaciones de publicaciones y pedidos

**Rama**: `feature/notifications` · **Creada**: 2026-10-24 · **Estado**: Implementada
**Origen**: Clase 7 (notificaciones locales) y Clase 10 (push con EAS Build); HU19 (notificaciones).

## Escenarios de usuario y pruebas

### Historia 1 · Recordatorio al publicar (Prioridad: P1)

Como vendedor quiero que la app me recuerde mi prenda al día siguiente de publicarla para
compartirla y venderla más rápido.

**Por qué P1**: es la feature de hardware mínima de la Clase 7 integrada al CRUD real.

**Prueba independiente**: publicar una prenda en un celular y ver la notificación programada; borrarla
y comprobar que se cancela.

**Escenarios de aceptación**:

1. **Dado** que publico una prenda y acepto las notificaciones, **Cuando** pasan 24 h, **Entonces**
   recibo "Tu prenda sigue publicada".
2. **Dado** un recordatorio programado, **Cuando** borro la prenda, **Entonces** el recordatorio se cancela.
3. **Dado** que rechazo el permiso, **Cuando** publico, **Entonces** la prenda se publica igual y veo un aviso.

### Historia 2 · Aviso de venta nueva (Prioridad: P2)

Como vendedor particular quiero enterarme al instante de una venta para prepararla a tiempo.

**Prueba independiente**: dos celulares con builds de EAS; el comprador confirma una compra y el
vendedor recibe el push.

**Escenarios de aceptación**:

1. **Dado** que activé "Notificaciones push" en Ajustes, **Cuando** alguien compra una prenda mía,
   **Entonces** recibo "Nueva venta" y al tocarla se abre "Mis ventas".

### Historia 3 · Aviso de cambio de estado (Prioridad: P2)

Como comprador quiero saber cuándo mi pedido cambia de estado.

**Escenarios de aceptación**:

1. **Dado** un pedido mío, **Cuando** el vendedor lo marca "enviado", **Entonces** recibo
   "Tu pedido cambió de estado" y al tocarla se abre "Mis compras".
2. **Dado** que yo mismo cancelo el pedido, **Entonces** no recibo un aviso de mi propia acción.

### Casos límite

- Simulador o Expo Go: no hay token push; la app lo explica y el interruptor queda apagado.
- El mismo celular pasa a otra cuenta: el token se reasigna a la cuenta nueva.
- Cerrar sesión: el token se borra para que el celular no reciba avisos de la cuenta anterior.
- Si Expo no responde, la compra o el cambio de estado no fallan.

## Requisitos

### Funcionales

- **RF-001**: El permiso de notificaciones se pide al publicar o al activar el interruptor, nunca al abrir la app.
- **RF-002**: Android usa un canal propio ("Publicaciones y pedidos").
- **RF-003**: Cada recordatorio guarda su id por prenda y se cancela al borrarla.
- **RF-004**: Ajustes permite activar y desactivar el push del dispositivo.
- **RF-005**: El servidor envía el push; el cliente nunca decide a quién notificar.
- **RF-006**: Un fallo al notificar nunca revierte la transacción del pedido.

### Entidades

- **push_tokens**: token de Expo (clave), usuario, plataforma, fecha. RLS: cada usuario ve y borra sólo los suyos.

## Criterios de éxito

- **CE-001**: El push llega en menos de 10 s desde el cambio de estado en un celular con datos.
- **CE-002**: 0 notificaciones de prendas ya borradas.
- **CE-003**: Las pruebas unitarias de programar y cancelar pasan en CI.

## Supuestos

- Sólo se notifica a particulares en ventas; las ventas de empresas se ven en "Mis ventas" (fuera de alcance).
- El proyecto de Supabase tiene habilitada la extensión `pg_net`.
