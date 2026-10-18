# New You

Marketplace móvil de indumentaria para la compra y venta de prendas nuevas y pre-owned.

**Proyecto Integrador — Aplicaciones Móviles**
**Universidad Nacional de Pilar**
**Tecnicatura Universitaria en Desarrollo de Software**

---

## Equipo de trabajo

| Integrante            | Rol                               |
| --------------------- | --------------------------------- |
| **Yuriangel Pérez**   | Scrum Master / Desarrolladora     |
| **Alejandro Terzano** | Project Manager / Diseñador UX/UI |
| **Daiana Lencina**    | Product Owner / QA                |
| **Carlos Semeco**     | Desarrollador                     |

**Docente:** Ariel Bulacio

La documentación oficial define estos cuatro roles dentro del equipo de trabajo.

---

## Descripción

**New You** es una aplicación móvil de marketplace de indumentaria que conecta dos modelos de comercialización:

* **B2C (Business to Consumer):** tiendas físicas y marcas locales pueden publicar sus productos y administrar su stock.
* **C2C (Consumer to Consumer):** usuarios particulares pueden publicar y comercializar prendas nuevas o pre-owned.

La plataforma busca ofrecer un canal digital estructurado para la compra y venta de indumentaria, incorporando categorización, búsqueda, filtros por talle, disponibilidad de stock y un carrito de compras.

El proyecto se desarrolla siguiendo el alcance establecido para el **First Delivery MVP**.

---

## Objetivos del MVP

El MVP tiene como objetivo validar técnicamente y funcionalmente un marketplace móvil de indumentaria mediante:

* Autenticación segura de usuarios.
* Catálogo de productos.
* Búsqueda y filtrado.
* Publicación y gestión de prendas.
* Control de stock.
* Carrito de compras.
* Flujo de checkout.
* Integración con servicios de geolocalización.
* Persistencia de información relevante en el dispositivo.

## La documentación establece como funcionalidades principales del MVP la autenticación, catálogo, registro de prendas y carrito, mientras que la geolocalización se clasifica como requisito Should Have.

# Alcance funcional

## Must Have

### M1 — Autenticación real

La aplicación utiliza **Supabase Auth** para:

* Registro de usuarios.
* Inicio de sesión.
* Gestión de sesiones.
* Asociación de publicaciones con el usuario autenticado.
* Autenticación mediante JWT.

La documentación establece además el uso de RLS para proteger los recursos asociados a cada usuario.

### M2 — Catálogo

El catálogo permite:

* Consultar productos desde Supabase PostgreSQL.
* Visualizar publicaciones mediante `FlatList`.
* Manejar estados de carga, vacío, error y datos.
* Mostrar disponibilidad y stock.
* Acceder al detalle de una publicación.
* Actualizar el contenido mediante pull-to-refresh.

El requisito no funcional establece como objetivo que las consultas del catálogo respondan en menos de 1,5 segundos bajo una red móvil estándar.

### M3 — Registro de prendas

Los vendedores pueden crear publicaciones mediante un formulario validado con:

* React Hook Form.
* Zod.
* Supabase PostgreSQL.
* Supabase Storage.

La publicación contempla:

* Nombre.
* Precio.
* Categoría.
* Talle.
* Color.
* Descripción.
* Stock.
* Disponibilidad.
* Imagen opcional.

La fotografía no es obligatoria para completar una publicación.

### M4 — Carrito

El carrito utiliza **Zustand** como estado global.

Actualmente permite:

* Agregar productos.
* Aumentar cantidades.
* Disminuir cantidades.
* Eliminar productos.
* Actualizar cantidades.
* Vaciar el carrito.
* Calcular cantidad total.
* Calcular subtotal.
* Respetar el stock disponible.
* Persistir el estado mediante AsyncStorage.

La documentación establece el carrito global con Zustand y el cálculo de subtotales y comisiones como parte del requisito M4.

---

# Funcionalidades implementadas

## Autenticación

* Registro mediante Supabase Auth.
* Login mediante Supabase Auth.
* Gestión de sesión.
* Asociación de productos con el usuario autenticado.
* Roles de usuario para particulares y vendedores/comercios.

## Catálogo

* Catálogo dinámico desde Supabase.
* `FlatList`.
* Pull-to-refresh.
* Estados de carga, error, vacío y datos.
* Indicador de productos agotados.
* Deshabilitación de acciones cuando no existe stock.
* Detalle dinámico de producto.

## Búsqueda y filtros

Home incorpora búsqueda por texto.

La sección de categorías permite:

* Navegar por tipo de prenda.
* Buscar dentro de una categoría.
* Filtrar por talle.
* Utilizar talles específicos para indumentaria.
* Utilizar talles numéricos específicos para calzado.

Esto responde a **HU04**, que define la búsqueda y filtrado por categoría y talle como funcionalidad de la Primera Entrega.

## Publicación de prendas

Los vendedores pueden:

* Crear publicaciones.
* Definir stock.
* Seleccionar categoría.
* Seleccionar talle.
* Seleccionar colores.
* Agregar descripción.
* Adjuntar una imagen opcional.

Las imágenes se gestionan mediante Supabase Storage.

## Gestión de publicaciones

La sección **Mis publicaciones** permite al vendedor:

* Consultar sus publicaciones.
* Ver precio y stock.
* Consultar disponibilidad.
* Editar publicaciones.
* Modificar stock.
* Reemplazar imágenes.
* Eliminar publicaciones.

Estas funcionalidades corresponden a **HU08**, que establece la administración de publicaciones propias durante la Primera Entrega.

## Carrito

El carrito permite:

* Agregar productos.
* Seleccionar variantes de talle y color.
* Modificar cantidades.
* Eliminar productos.
* Controlar cantidades según stock.
* Calcular subtotal.
* Persistir el contenido mediante Zustand + AsyncStorage.

---

# Estado del Product Backlog

| ID   | Historia de usuario                         | Estado          |
| ---- | ------------------------------------------- | --------------- |
| HU01 | Registro                                    | Implementado    |
| HU02 | Login                                       | Implementado    |
| HU03 | Catálogo                                    | Implementado    |
| HU04 | Búsqueda y filtros                          | Implementado    |
| HU05 | Detalle de producto                         | Implementado    |
| HU06 | Publicación particular                      | Implementado    |
| HU07 | Publicación de tienda y stock               | Implementado    |
| HU08 | Gestión de publicaciones                    | Implementado    |
| HU09 | Agregar al carrito                          | Implementado    |
| HU10 | Modificar carrito                           | Implementado    |
| HU11 | Selección de retiro/envío                   | Implementado    |
| HU12 | Selección de medio de pago                  | Implementado    |
| HU13 | Resumen y total                             | Implementado    |
| HU14 | Confirmación y código de compra             | Implementado    |
| HU15 | Chat interno                                | Segunda entrega |
| HU16 | Persistencia ante pérdida de conectividad   | Implementado    |
| HU17 | Ubicación manual                            | Implementado    |
| HU18 | Perfil                                      | Implementado    |
| HU19 | Configuración, modo oscuro y notificaciones | Posterior       |
| HU20 | Indicador de producto agotado               | Implementado    |

El Product Backlog oficial contiene 20 historias de usuario y clasifica HU01–HU14 y HU20 dentro de la Primera Entrega/MVP.

---

# Checkout

El checkout está implementado (`app/checkout/index.tsx`) y se puede llegar a él de dos formas:

* **Desde el carrito**, para pagar todo el contenido.
* **Con "Comprar ahora"** en el detalle de una prenda, para pagar solo esa prenda y cantidad sin tocar el carrito.

Flujo:

1. Selección de **retiro en el local** o **envío a domicilio**.
   * Retiro: se muestra la dirección de retiro de cada prenda (la dirección elegida por el vendedor al publicar).
   * Domicilio: el comprador elige una de sus direcciones guardadas o escribe una nueva (con GPS opcional y enlace "Ver en el mapa").
2. Medio de pago: efectivo, tarjeta, Mercado Pago o transferencia (checkout lógico, sin pasarela real).
3. Resumen: productos, descuentos, envío, impuestos y total.
4. Confirmación con clave de operación única (`operationKey`, formato `NY-ORD-…`).
5. La función `confirmar_compra` de Supabase registra la orden y descuenta el stock en una sola transacción; reintentar con la misma clave devuelve la orden ya creada, sin duplicar.
6. Un producto sin stock queda como **AGOTADO** (la disponibilidad se deriva de `stock > 0`).

Después de comprar, el historial se consulta en **Perfil → Mis compras**; los vendedores ven además **Mis ventas**.

### Modo offline

Si no hay conexión al publicar una prenda o confirmar una compra, la operación se guarda en AsyncStorage (`ny_drafts`) y se muestra un aviso ámbar. Al volver la red, un listener de NetInfo sincroniza los borradores automáticamente. Las compras no se duplican gracias a la `operationKey`.

### Pago

La integración de una pasarela de pago real, como Mercado Pago, queda fuera del alcance del First Delivery. El MVP utiliza un **checkout lógico**.

---

# Geolocalización y direcciones

Implementado con `expo-location`:

* **GPS con fallback manual:** el botón "Usar mi ubicación (GPS)" obtiene la dirección mediante geocodificación inversa (con OpenStreetMap como alternativa en web). Si el GPS falla, se deniegan los permisos o no hay señal, el campo de texto manual siempre queda disponible.
* **Verificación:** el enlace "Ver en el mapa" abre la dirección escrita en Google Maps para comprobarla.
* **Direcciones guardadas:** en **Perfil → Direcciones** cada usuario administra sus direcciones y elige una como principal. Al publicar una prenda se elige la dirección de retiro (o se carga una nueva); las publicaciones anteriores sin dirección toman automáticamente la principal.

---

# Puesta en marcha

```bash
npm install
npm start        # o: npm run android / npm run web
npm test         # pruebas unitarias (Jest)
npx tsc --noEmit # chequeo de tipos
```

Variables de entorno (archivo `.env`):

```text
EXPO_PUBLIC_SUPABASE_URL=
EXPO_PUBLIC_SUPABASE_ANON_KEY=
```

### Configuración de Supabase

1. Crear el bucket **público** `productos-fotos` en Storage, con una política de `INSERT` para usuarios autenticados y lectura pública.
2. Ejecutar en el SQL Editor, **en este orden**, los scripts de [`supabase/migraciones/`](supabase/migraciones/):
   1. `01-checkout.sql`: clave de idempotencia (`operation_key`), numeración de órdenes y la función `confirmar_compra`, que registra la compra y descuenta el stock en una sola transacción.
   2. `02-historial.sql`: política RLS de lectura de las propias compras y la función `mis_ventas()` para el vendedor.
   3. `03-direcciones.sql`: columnas de dirección y la dirección de entrega en `compras`.
   4. `04-mis-direcciones.sql`: tabla `direcciones` con RLS, dirección de retiro por publicación (con relleno automático de las anteriores) y la función `direcciones_retiro()`.

Sin estos scripts fallan el checkout, "Mis compras/ventas" y las direcciones.

---

# Arquitectura

El proyecto utiliza una arquitectura basada en Expo Router y separación por responsabilidades.

```text
newyou-app/
│
├── app/
│   ├── (auth)/           login.tsx, register.tsx
│   ├── (tabs)/           index, categorias, carrito, favoritos, perfil
│   ├── checkout/         index.tsx
│   ├── producto/         [id].tsx, nuevo.tsx
│   ├── editar/           [id].tsx
│   ├── direcciones.tsx
│   ├── mis-compras.tsx
│   ├── mis-ventas.tsx
│   ├── mis-publicaciones.tsx
│   └── _layout.tsx       guardia de rutas y sincronización offline
│
├── components/           TarjetaProducto, BottomTabBar, HistorialPedidos, ui/
├── constants/            theme.ts, routes.ts, categorías
├── hooks/                useProductos, useProductoById, useMisProductos, useDirecciones
├── schemas/              productoSchema.ts
├── services/             supabase, productos, compras, direcciones, storage, location, offline
├── stores/               useCarritoStore, useUsuarioStore, useFavoritosStore
├── supabase/migraciones/ scripts SQL
├── __tests__/            pruebas unitarias (carrito y esquema de producto)
└── types/
```

La documentación define Expo Router como sistema de navegación, una estructura basada en archivos dentro de `app/` y Zustand como solución para el estado global del carrito.

---

# Stack tecnológico

### Frontend

* React Native
* Expo SDK 57
* React 19
* TypeScript
* Expo Router

### Estado y formularios

* Zustand
* React Hook Form
* Zod
* AsyncStorage

### Backend

* Supabase
* Supabase Auth
* PostgreSQL
* Supabase Storage
* Supabase Realtime

### APIs nativas

* Expo Image Picker
* Expo Location
* NetInfo

### Testing

* Jest + jest-expo

La documentación de Etapa 2 especifica este stack como el utilizado efectivamente en el proyecto.

---

# Modelo de datos

Principales tablas de Supabase:

```text
profiles      id, email, username, role (comprador | vendedor)
productos     productoid, nombre, precio, stock, categoriaid, imagen_url, talles, colores,
              tipo_prenda, temporada, publico, creado_por, direccion_retiro
categorias    categoriaid, nombre
direcciones   id, usuario_id, alias, direccion, es_principal
compras       compraid, usuario_id, numero_orden, entrega, metodo_pago, subtotal_original,
              descuentos, envio, impuestos, total, items (JSONB), operation_key (único),
              direccion_entrega
```

* La disponibilidad de un producto se deriva del stock (`stock > 0`).
* Roles: comprador y vendedor. Un comprador puede pasar a vendedor desde el Perfil.
* Las compras guardan los ítems en formato JSONB y se registran con la función `confirmar_compra`.

---

# Seguridad

El proyecto utiliza Supabase Auth y debe implementar políticas **Row Level Security (RLS)** para garantizar que los usuarios solamente puedan modificar o eliminar sus propias publicaciones.

También debe garantizarse que los endpoints públicos no expongan información personal sensible de vendedores particulares.

Estos requisitos forman parte de los requisitos no funcionales del proyecto.

### Estado actual

* Autenticación con Supabase: implementada.
* Asociación de publicaciones al usuario: implementada.
* Protección de rutas: implementada (sin sesión se redirige a login; con sesión, `(auth)` redirige al home).
* Roles: el botón de publicar, Mis publicaciones y Mis ventas se muestran solo a vendedores.
* RLS: aplicado a `compras` y `direcciones` mediante los scripts de `supabase/migraciones/`; las funciones `SECURITY DEFINER` solo exponen lo necesario. Verificar las políticas de `productos` y `profiles` en el panel de Supabase.

---

# Diseño y accesibilidad

El proyecto utiliza un sistema centralizado de Design Tokens mediante:

```text
constants/theme.ts
```

Se contemplan:

* Colores.
* Espaciados.
* Radios.
* Tipografía.

La documentación establece el uso unificado de estos tokens y criterios de accesibilidad basados en WCAG 2.2 AA.

También se utiliza una navegación inferior mediante Bottom Tab Bar para favorecer la ergonomía móvil.

---

# Priorización de funcionalidades

## First Delivery — MVP

**Must Have**

* M1 Autenticación.
* M2 Catálogo.
* M3 Registro de prendas.
* M4 Carrito.

**Should Have**

* S1 Geolocalización.

**Could Have**

* C1 Dashboard de ventas.

**Won't Have**

* W1 Pasarela de pago real.
* W2 Moderación automática de imágenes mediante IA.

Esta priorización corresponde a la matriz MoSCoW definida en la documentación del proyecto.

---

# Funcionalidades posteriores

Las siguientes funcionalidades no son necesarias para cerrar el First Delivery:

* Chat interno.
* Funcionalidades avanzadas offline.
* Perfil completo.
* Configuración avanzada.
* Modo oscuro.
* Notificaciones.
* Dashboard de ventas.

Estas funcionalidades corresponden a etapas posteriores o a funcionalidades clasificadas como Could/Won't dentro del alcance definido.

---

# Estado actual del proyecto

El MVP está implementado de punta a punta:

* Autenticación con guardia de rutas y roles (comprador / vendedor).
* Catálogo, búsqueda, categorías y filtros por talle.
* Detalle de producto con **Agregar al carrito** y **Comprar ahora**.
* Alta y edición de prendas con foto (cámara o galería) y dirección de retiro.
* Gestión de publicaciones, control de stock e indicador AGOTADO.
* Carrito global con Zustand y persistencia con AsyncStorage.
* Checkout con idempotencia, descuento de stock y modo offline con sincronización automática.
* Mis compras, Mis ventas y Direcciones guardadas.
* GPS con fallback manual y verificación en mapa.
* Pruebas unitarias del carrito y del esquema de producto.

Pendientes o mejoras opcionales:

1. Editar la dirección de retiro de una publicación ya creada.
2. Límite de 1080 px para las fotos (requiere `expo-image-manipulator`).
3. `getItemLayout` en la lista del Home.
4. Comisión de servicio C2C en el resumen.
5. Descuentos e impuestos reales en el resumen (hoy se muestran en $0).
6. Revisión final de las políticas RLS de `productos` y `profiles`.

---

# Control de versiones

El proyecto utiliza Git y GitHub para el control de versiones.

La estrategia definida para el equipo contempla:

* `main` como rama estable.
* Ramas independientes por funcionalidad.
* Pull Requests para integrar cambios.
* Revisión de código por al menos un integrante antes del merge.

---

# Licencia

Proyecto académico desarrollado para la **Universidad Nacional de Pilar** en el marco de la Tecnicatura Universitaria en Desarrollo de Software.
