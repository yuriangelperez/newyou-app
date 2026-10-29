# Guía de instalación — New You

Pasos para poner en marcha la app desde cero: el código, la base en Supabase, los pagos, el correo de compra, las variables de entorno, la página de invitaciones y el instalable para Android.

## 1. Requisitos

- Node.js 22 (la misma versión que usa GitHub Actions) y npm.
- Git.
- Una cuenta de Supabase con un proyecto creado.
- Una cuenta de Expo (para EAS Build) y la app Expo Go en el celular.
- Para el correo de confirmación de compra: una cuenta de Gmail con verificación en dos pasos (para crear una contraseña de aplicación), o una cuenta de Resend.
- Para pagar con Mercado Pago: una cuenta de Mercado Pago Developers con una aplicación de prueba (Checkout Pro). Las tarjetas de crédito y débito no la necesitan.

## 2. Código

```bash
git clone https://github.com/yuriangelperez/newyou-app.git
cd newyou-app
git checkout testing
npm install
```

## 3. Variables de entorno

Copiar `.env.example` como `.env` y completar los valores con los de Supabase (Project Settings > API):

```
EXPO_PUBLIC_SUPABASE_URL=https://<tu-proyecto>.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=<anon key>
EXPO_PUBLIC_FUENTE_PRODUCTOS=
EXPO_PUBLIC_URL_INVITACION=https://yuriangelperez.github.io/newyou-app/invitacion/
```

- `EXPO_PUBLIC_FUENTE_PRODUCTOS` vacío lee el catálogo de Supabase; con `dummyjson` usa la API de prueba de la Clase 12.
- El `.env` sólo admite líneas `NOMBRE=valor` o comentarios con `#`. Un comando pegado en el archivo (por ejemplo `npx eas-cli ...`) rompe `supabase functions deploy`, que también lee ese archivo.
- El `.env` no se sube a GitHub. Nunca pegar claves en el chat ni en commits.

## 4. Base de datos (Supabase)

### 4.1 Extensiones

En Database > Extensions activar:

- `pg_net`: la usa el trigger que manda las notificaciones push (migración 14).
- `pg_cron` (opcional): borra los borradores vencidos todos los días (migración 16). Sin ella la app igual los borra al abrir Mis publicaciones.

### 4.2 Migraciones

Las migraciones están en `supabase/migraciones` y se corren a mano, una vez cada una y en orden, pegándolas en el SQL Editor y presionando Run.

| Archivo | Qué agrega |
| --- | --- |
| 00-base.sql | **No se ejecuta.** Es la referencia del estado de la base antes de la 05 (tablas `profiles`, `categorias`, `productos`, `compras` y sus políticas). En un proyecto nuevo esas cuatro tablas tienen que existir antes de la 01; sus columnas están en el diccionario de datos de la Etapa 1, sección 10. |
| 01-checkout.sql | Compra idempotente (`operation_key`) y descuento de stock |
| 02-historial.sql | Lectura de las compras propias |
| 03-direcciones.sql | Dirección de entrega en la compra |
| 04-mis-direcciones.sql | Tabla `direcciones` y dirección de retiro por prenda |
| 05-particular.sql | Rol `particular` y limpieza de políticas duplicadas |
| 06-empresas.sql | Empresas, sedes, roles, permisos, miembros e invitaciones |
| 07-admin.sql | Administradores de la plataforma y revisiones de empresas |
| 08-stock-sedes.sql | Stock por sede |
| 09-imagenes.sql | Hasta 5 imágenes por prenda |
| 10-pedidos.sql | Pedidos, ítems y eventos (máquina de estados) |
| 11-envios-metricas.sql | Correo y código de seguimiento, métricas |
| 12-calificaciones.sql | Calificaciones y respuestas |
| 13-descuentos.sql | Descuento por prenda |
| 14-push-tokens.sql | Tokens y envío de notificaciones push (necesita `pg_net`) |
| 15-vendedores-equipo.sql | Vendedor visible en la prenda y salida de empleados |
| 16-etapa1-mejoras.sql | Login con usuario, ajustes, categorías por grupo, borradores, correo de compra |
| 17-metricas-rango.sql | Métricas por rango de fechas (`metricas_ventas_rango`) |
| 18-condicion-productos.sql | Condición de la prenda (`nuevo` o `usado`) y público múltiple (`publico` pasa a `text[]`: Adulto, Femenino, Masculino, Infantil, Unisex) |
| 19-pagos-mercadopago.sql | Pagos con tarjeta de crédito y débito (API de tarjetas simulada) y Mercado Pago: estado del pago, comisión del 6% con crédito, cuotas e interés, marca y últimos 4 dígitos; quita la transferencia |

La app nueva lee columnas de la 16 (`productos.estado`): correrla antes de abrir esa versión. Sin la 17, los rangos de Métricas que no terminan hoy muestran un aviso. La 18 hace falta para publicar o editar prendas desde la versión que pide condición y varios públicos. La 19 hace falta para pagar con tarjeta o Mercado Pago (sin ella el checkout responde "Medio de pago inválido").

### 4.3 Storage

Crear en Storage un bucket **público** llamado `productos`. Ahí se suben las fotos de las prendas (`services/storageService.ts`). Se puede usar otro nombre con la variable `EXPO_PUBLIC_SUPABASE_PRODUCTS_BUCKET`.

### 4.4 Autenticación

En Authentication > URL Configuration agregar en Redirect URLs la dirección a la que vuelve el enlace de recuperación de contraseña: `newyou://nueva-contrasena` para el build de EAS y la dirección `exp://<ip>:8081/--/nueva-contrasena` que corresponde a Expo Go en la red local.

### 4.5 Administrador de la plataforma

Las empresas nacen pendientes. Para que alguien pueda verificarlas desde el Panel de administrador, cargar su usuario una vez desde el SQL Editor:

```sql
INSERT INTO public.plataforma_admins (usuario_id)
SELECT id FROM auth.users WHERE email = '<correo del administrador>';
```

### 4.6 Datos de prueba (opcional)

`npm run seed:productos` carga prendas de ejemplo (`scripts/seed-productos.mjs`).

## 5. Funciones del servidor (Edge Functions)

Hay cuatro funciones en `supabase/functions`. Se despliegan una vez desde la carpeta del proyecto:

```bash
npx supabase login
npx supabase link --project-ref <ref del proyecto>
npx supabase functions deploy enviar-correo-compra
npx supabase functions deploy pago-tarjeta
npx supabase functions deploy pago-mercadopago
npx supabase functions deploy mp-webhook --no-verify-jwt
```

| Función | Para qué | Secretos |
| --- | --- | --- |
| `enviar-correo-compra` | Correo con el detalle de la compra (incluye comisión y cuotas si se pagó con crédito) | `GMAIL_USUARIO` y `GMAIL_CLAVE`, o `RESEND_API_KEY` (y opcional `CORREO_REMITENTE`) |
| `pago-tarjeta` | API de tarjetas propia y simulada: valida la tarjeta otra vez en el servidor, calcula el interés de las cuotas y aprueba o rechaza según el titular | Ninguno |
| `pago-mercadopago` | Crea, verifica y cancela el pago de Checkout Pro | `MP_ACCESS_TOKEN` |
| `mp-webhook` | Recibe los avisos de Mercado Pago aunque el comprador cierre la app | `MP_WEBHOOK_SECRET` (opcional) |

### 5.1 Correo de compra

Sale por Gmail si están `GMAIL_USUARIO` y `GMAIL_CLAVE`; si no, por Resend. Con tarjeta o Mercado Pago se manda recién cuando se aprueba el pago, y una sola vez por compra.

```bash
npx supabase secrets set GMAIL_USUARIO=<cuenta>@gmail.com GMAIL_CLAVE="<contraseña de aplicación>"
# o, en lugar de Gmail:
npx supabase secrets set RESEND_API_KEY=<clave de Resend>
```

- `GMAIL_CLAVE` es una contraseña de aplicación de Google (Cuenta de Google > Seguridad > Verificación en dos pasos > Contraseñas de aplicaciones), no la contraseña de la cuenta. Con Gmail el correo llega a cualquier destinatario.
- Sin dominio verificado en Resend, el remitente de prueba (`onboarding@resend.dev`) sólo entrega a la dirección con la que se creó la cuenta de Resend.
- Si una clave se compartió por error, regenerarla y volver a correr `secrets set`.
- Sin la función la compra igual se confirma; sólo no llega el correo.

### 5.2 Mercado Pago (modo prueba)

1. En https://www.mercadopago.com.ar/developers/panel/app crear una aplicación (Pagos online, Checkout Pro).
2. En **Credenciales de prueba** copiar el Access Token. Es secreto: va sólo en Supabase, nunca en la app ni en el `.env`.
3. `npx supabase secrets set MP_ACCESS_TOKEN=<access token de prueba>`
4. Opcional: en **Webhooks > Configurar notificaciones** poner `https://<ref del proyecto>.supabase.co/functions/v1/mp-webhook`, evento **Pagos**, y guardar la clave secreta con `npx supabase secrets set MP_WEBHOOK_SECRET=<clave>`.

Para probar se paga con un usuario de prueba comprador o como invitado con una tarjeta de prueba de Mercado Pago; con la cuenta real de Mercado Pago el pago falla.

### 5.3 Tarjetas de prueba (API propia)

No usan Mercado Pago. Vencimiento futuro (por ejemplo `11/30`), código `123` (4 dígitos en American Express) y DNI `12345678`:

| Tarjeta | Número | Tipo |
| --- | --- | --- |
| Visa | 4509 9535 6623 3704 | Crédito |
| Mastercard | 5031 7557 3453 0604 | Crédito |
| American Express | 3711 803032 57522 | Crédito |
| Visa | 4002 7686 9439 5619 | Débito |
| Mastercard | 5287 3383 1025 3304 | Débito |

El titular decide el resultado: `APRO` (o cualquier nombre) aprueba, `FUND` sin fondos, `SECU` código incorrecto, `CONT` en revisión y `OTHE` rechazado.

La comisión del 6% se cambia en `comision_tarjeta_credito()` (migración 19) y en `COMISION_CREDITO` de `services/pagosService.ts`; el interés de las cuotas, en `INTERES_CUOTAS` de `utils/tarjeta.ts` y su copia `supabase/functions/_shared/tarjeta.ts` (un test falla si difieren), y después se vuelve a desplegar `pago-tarjeta`. El detalle completo está en `docs/pagos-mercadopago.md`.

## 6. Página de invitaciones (GitHub Pages)

Los enlaces de invitación a una empresa son https para que se puedan abrir desde WhatsApp o el correo. La página está en `docs/invitacion/index.html` y abre la app con el código.

1. En GitHub: Settings > Pages > Source: Deploy from a branch, rama `main`, carpeta `/docs`.
2. Esperar a que termine la acción "pages build and deployment" (pestaña Actions).
3. Probar `https://yuriangelperez.github.io/newyou-app/invitacion/?codigo=PRUEBA`.

La página sólo existe en la rama publicada (`main`): los cambios de `docs/` tienen que llegar a `main` para verse.

## 7. Correr la app

### Expo Go (desarrollo)

```bash
npm start
```

Escanear el QR con Expo Go (Android) o con la cámara (iPhone). En Expo Go funcionan todas las pantallas salvo las notificaciones push, que necesitan un build de EAS.

### EAS Build (APK para Android)

Las variables `EXPO_PUBLIC_*` del `.env` no viajan al build: hay que cargarlas en EAS, en el entorno `preview` (el que usa el perfil `preview` de `eas.json`). Se cargan en expo.dev > proyecto > Environment variables, o con la consola:

```bash
npm install -g eas-cli
eas login
eas env:create --environment preview --name EXPO_PUBLIC_SUPABASE_URL --value https://<tu-proyecto>.supabase.co --visibility plaintext
eas env:create --environment preview --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value <anon key> --visibility plaintext
eas env:create --environment preview --name EXPO_PUBLIC_URL_INVITACION --value https://yuriangelperez.github.io/newyou-app/invitacion/ --visibility plaintext
eas build --profile preview --platform android
```

Al terminar, EAS muestra un enlace y un QR para descargar el `.apk`.

| Perfil | Uso | Resultado |
| --- | --- | --- |
| development | Development build con herramientas de depuración | Instalable interno |
| preview | Pruebas en los celulares del equipo | `.apk` |
| production | Publicación en Play Store | `.aab` |

## 8. Verificación

```bash
npm test          # Jest + React Native Testing Library
npm run lint      # ESLint
npx tsc --noEmit  # tipos
```

GitHub Actions corre lo mismo en cada push y pull request a `main`, `testing` y las ramas `datos-yuri` y `datos-ale` (`.github/workflows/test.yml`). Las pruebas de API (Postman), carga (JMeter) y extremo a extremo (Maestro) están en `docs/testing` y `.maestro`; ver `docs/testing/README.md`. Las pruebas de la API de mapas (Nominatim de OpenStreetMap) están en `postman/`: importar la colección y el entorno, completar `contact_email` y correrlas en el Runner con un delay de al menos 1100 ms.

### Flujo de ramas

Cada integrante trabaja en su rama `datos-<nombre>` y abre un pull request hacia `testing`. Si las pruebas de GitHub Actions pasan en `testing`, se abre otro pull request de `testing` a `main`, que es la rama publicada (GitHub Pages y builds).

## 9. Problemas frecuentes

| Síntoma | Causa y solución |
| --- | --- |
| La app se cierra con "Faltan las variables EXPO_PUBLIC_SUPABASE_URL y EXPO_PUBLIC_SUPABASE_ANON_KEY" | `.env` incompleto, o en un build de EAS faltan las variables del entorno `preview` |
| `supabase functions deploy` falla al leer `.env` | Hay una línea que no es `NOMBRE=valor`; comentarla con `#` |
| Error `column productos.estado does not exist` | Falta correr la migración 16 |
| Error al publicar con `condicion` o `publico` | Falta correr la migración 18 |
| No se puede publicar como empresa | La empresa está pendiente o suspendida: un administrador tiene que verificarla |
| "Medio de pago inválido" al pagar con tarjeta o Mercado Pago | Falta correr la migración 19 |
| El formulario de tarjeta dice que la función no está desplegada | Falta `supabase functions deploy pago-tarjeta` |
| Mercado Pago no abre o falla al crear el pago | Falta `MP_ACCESS_TOKEN` o se usó la cuenta real en lugar de una de prueba |
| No llega el correo de compra | Faltan `GMAIL_USUARIO`/`GMAIL_CLAVE` (o `RESEND_API_KEY`), o el pago todavía no se aprobó |
| No llegan las notificaciones push | Se está usando Expo Go, o falta activar `pg_net` antes de la migración 14 |
| El enlace de invitación da 404 | GitHub Pages no está activado o `docs/` todavía no llegó a `main` |
