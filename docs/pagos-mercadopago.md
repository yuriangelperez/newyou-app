# Pagos: tarjetas y Mercado Pago

En el checkout hay cuatro medios de pago (todo en modo prueba: no se mueve plata real):

| Medio | Cómo cobra | Recargo |
| --- | --- | --- |
| Efectivo | Al recibir, como antes | No |
| Tarjeta de crédito | Formulario propio + API de tarjetas propia (Edge Function `pago-tarjeta`), en 1, 3, 6 o 12 cuotas | **6 % de comisión** sobre productos + envío |
| Tarjeta de débito | Igual que crédito, sólo tarjetas de débito y en 1 pago | No |
| Mercado Pago | [Checkout Pro](https://www.mercadopago.com.ar/developers/es/docs/checkout-pro/landing): dinero en cuenta o débito | No |

La transferencia bancaria se quitó. La comisión la calcula el servidor (`comision_tarjeta_credito()` en
`19-pagos-mercadopago.sql`); para cambiarla hay que editar ese número y `COMISION_CREDITO` en
`services/pagosService.ts`, que sólo la muestra. Con "Mercado Pago" no se ofrece crédito, para que la comisión
no se pueda esquivar.

## Tarjetas: API propia (simulada)

Las tarjetas **no** usan Mercado Pago. La app tiene su propio formulario (`components/FormularioTarjeta.tsx`)
y su propia "pasarela" de prueba (`supabase/functions/pago-tarjeta`), que valida como un procesador real
pero decide el resultado según el nombre del titular.

1. `confirmar_compra` registra la compra con la comisión y reserva el stock (`estado_pago = 'pendiente'`).
2. Se abre el formulario: número (con vista previa de la tarjeta y la marca), titular, vencimiento, código, DNI
   y cuotas (sólo crédito). Valida en el celular con `utils/tarjeta.ts`: algoritmo de Luhn, marca por prefijo,
   vencimiento vigente, 3 dígitos de código (4 en American Express) y DNI de 7 u 8 números.
3. `pago-tarjeta` (`accion: 'pagar'`) **vuelve a validar todo** en el servidor (copia en
   `supabase/functions/_shared/tarjeta.ts`; un test verifica que sean iguales), revisa que una tarjeta de débito
   no se use como crédito ni al revés y cobra `compras.total` (no el monto que manda el celular).
4. Sólo se guardan la marca, los últimos 4 dígitos y las cuotas (`compras.tarjeta_marca`, `tarjeta_ultimos4`,
   `cuotas`). Nunca el número completo ni el código.
5. Aprobado: confirmación y correo. Rechazado: se muestra el motivo, se borra el código y se puede reintentar.
   **Cancelar** (`accion: 'cancelar'`): se anula la compra, vuelve el stock y el carrito queda igual.

## Mercado Pago (Checkout Pro)

1. El comprador toca **PAGAR Y FINALIZAR**. `confirmar_compra` registra la compra y reserva el stock;
   la compra queda con `estado_pago = 'pendiente'`.
2. La app llama a la Edge Function `pago-mercadopago` (`accion: 'crear'`). La función arma la
   preferencia con los precios guardados en `pedido_items` (no los del celular) y devuelve el link.
3. El pago se abre dentro de la app (WebView; en la web, en otra pestaña). Rapipago / Pago Fácil quedan
   afuera porque dejarían el stock reservado varios días.
4. Al terminar, Mercado Pago vuelve a la URL de regreso; la app la intercepta y pide `accion: 'verificar'`.
   La función consulta el pago a la API de Mercado Pago y lo guarda con `registrar_pago_mp`.
   - **Aprobado**: se vacía el carrito, se manda el correo y se muestra la confirmación.
   - **En revisión**: la compra queda registrada; el webhook la actualiza cuando se acredita.
   - **Rechazado o cancelado**: `accion: 'cancelar'` anula la compra, devuelve el stock y el carrito queda igual.
5. `mp-webhook` recibe los avisos de Mercado Pago y actualiza la compra aunque el comprador haya cerrado la app.
6. Mientras el pago no esté aprobado, el vendedor no puede avanzar el pedido (trigger `exigir_pago_acreditado`).
   Las compras sin pagar se anulan solas después de una hora (`anular_pagos_vencidos`).

## Puesta en marcha (una vez)

1. **Migración**: correr `supabase/migraciones/19-pagos-mercadopago.sql` en el SQL Editor de Supabase.
2. **Credenciales de prueba de Mercado Pago**:
   - Entrar a <https://www.mercadopago.com.ar/developers/panel/app> y crear una aplicación
     (tipo de pago: *Pagos online*, producto: *Checkout Pro*).
   - En la aplicación, ir a **Credenciales de prueba** y copiar el **Access Token** (`APP_USR-...` o `TEST-...`).
     Es secreto: va sólo en Supabase, nunca en la app ni en el `.env`. Las tarjetas no lo necesitan.
3. **Desplegar las funciones** (desde la carpeta del proyecto, con la CLI de Supabase):

   ```bash
   npx supabase login
   npx supabase link --project-ref <id-de-tu-proyecto>
   npx supabase secrets set MP_ACCESS_TOKEN=<access-token-de-prueba>
   npx supabase functions deploy pago-tarjeta
   npx supabase functions deploy pago-mercadopago
   npx supabase functions deploy mp-webhook --no-verify-jwt
   npx supabase functions deploy enviar-correo-compra
   ```

4. **Webhook (opcional, recomendado)**: en la aplicación de Mercado Pago, **Webhooks > Configurar notificaciones**,
   URL de prueba `https://<id-de-tu-proyecto>.supabase.co/functions/v1/mp-webhook`, evento **Pagos**.
   Copiar la clave secreta que muestra y guardarla con `npx supabase secrets set MP_WEBHOOK_SECRET=<clave>`.

## Probar

### Tarjetas (formulario propio)

En el formulario, "Ver tarjetas de prueba" muestra esta misma lista.

| Tarjeta | Número | Tipo |
| --- | --- | --- |
| Visa | 4509 9535 6623 3704 | Crédito |
| Mastercard | 5031 7557 3453 0604 | Crédito |
| American Express | 3711 803032 57522 (código de 4 dígitos) | Crédito |
| Visa | 4002 7686 9439 5619 | Débito |
| Mastercard | 5287 3383 1025 3304 | Débito |

Vencimiento futuro (ej. `11/30`), código `123`, DNI `12345678`. El **titular** decide el resultado:
`APRO` (o cualquier nombre) aprobado · `FUND` sin fondos · `SECU` código incorrecto · `CONT` en revisión · `OTHE` rechazado.

- Con `APRO` en crédito: el resumen y la confirmación muestran la comisión del 6 %, y en Supabase
  `compras.estado_pago = 'aprobado'` con la marca y los últimos 4 dígitos.
- Una tarjeta de débito en "Tarjeta de crédito": avisa que no es de crédito y no cobra.
- Con `FUND`: muestra "La tarjeta no tiene fondos suficientes" y deja reintentar.
- **Cancelar**: el stock vuelve, los pedidos quedan `cancelado` y el carrito sigue con las prendas.

### Mercado Pago (Checkout Pro)

Pagar con un usuario de prueba comprador (**Cuentas de prueba** del panel) o como invitado con una tarjeta de
débito de prueba de Mercado Pago (4002 7686 9439 5619, código 123, vencimiento 11/30, titular `APRO`).
No uses tu cuenta real de Mercado Pago con credenciales de prueba: el pago falla.

- Con `CONT`: pantalla "Compra registrada" (pago en revisión) y el vendedor no puede confirmar el pedido.
