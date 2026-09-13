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
| HU11 | Selección de retiro/envío                   | Pendiente       |
| HU12 | Selección de medio de pago                  | Pendiente       |
| HU13 | Resumen y total                             | Pendiente       |
| HU14 | Confirmación y código de compra             | Pendiente       |
| HU15 | Chat interno                                | Segunda entrega |
| HU16 | Persistencia ante pérdida de conectividad   | Segunda entrega |
| HU17 | Ubicación manual                            | Segunda entrega |
| HU18 | Perfil                                      | Segunda entrega |
| HU19 | Configuración, modo oscuro y notificaciones | Posterior       |
| HU20 | Indicador de producto agotado               | Implementado    |

El Product Backlog oficial contiene 20 historias de usuario y clasifica HU01–HU14 y HU20 dentro de la Primera Entrega/MVP.

---

# Checkout

El checkout forma parte del alcance funcional definido para el MVP, pero **todavía no se encuentra implementado en la versión actual del proyecto**.

El flujo previsto contempla:

1. Selección de retiro en local o envío a domicilio.
2. Selección de medio de pago.
3. Resumen del pedido.
4. Subtotal.
5. Comisión de servicio.
6. Total.
7. Confirmación.
8. Generación de código único de compra.
9. Limpieza del carrito.
10. Protección contra operaciones duplicadas mediante `operationKey`.

La documentación de Etapa 2 especifica este flujo y la utilización de `operationKey` para garantizar la idempotencia de las compras.

### Pago

La integración de una pasarela de pago real, como Mercado Pago, queda fuera del alcance del First Delivery.

El MVP utiliza un **checkout lógico** para representar el proceso de compra.

---

# Geolocalización

La geolocalización corresponde al requisito **S1 — Should Have**.

El diseño contempla:

* Obtención de ubicación mediante GPS.
* Identificación de la ubicación de comercios.
* Fallback mediante ingreso manual de la ubicación cuando el GPS no está disponible.

El fallback manual está contemplado específicamente para escenarios donde el GPS falla en interiores.

La implementación completa permanece pendiente.

---

# Arquitectura

El proyecto utiliza una arquitectura basada en Expo Router y separación por responsabilidades.

```text
newyou-app/
│
├── app/
│   ├── (auth)/
│   │   ├── login.tsx
│   │   └── register.tsx
│   │
│   ├── (tabs)/
│   │   ├── index.tsx
│   │   ├── categorias.tsx
│   │   ├── carrito.tsx
│   │   └── perfil.tsx
│   │
│   ├── producto/
│   │   ├── [id].tsx
│   │   └── nuevo.tsx
│   │
│   ├── editar/
│   │   └── [id].tsx
│   │
│   ├── mis-publicaciones.tsx
│   └── _layout.tsx
│
├── components/
│   └── TarjetaProducto.tsx
│
├── constants/
│   ├── theme.ts
│   └── routes.ts
│
├── hooks/
│   ├── useProductos.ts
│   └── useMisProductos.ts
│
├── schemas/
│   └── productoSchema.ts
│
├── services/
│   ├── productosService.ts
│   └── storageService.ts
│
├── stores/
│   ├── useCarritoStore.ts
│   └── useUsuarioStore.ts
│
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

La documentación de Etapa 2 especifica este stack como el utilizado efectivamente en el proyecto.

---

# Modelo de datos

## Usuario

Los usuarios se gestionan mediante Supabase Auth.

Información principal:

```text
Usuario
├── id (UUID)
├── email
├── nombre
└── rol
```

Roles contemplados:

* Particular.
* Comercio/Vendedor.

## Producto

```text
Producto
├── id
├── vendedor_id
├── nombre
├── precio
├── categoria
├── talle
├── descripcion
├── imagen_url
├── stock
└── disponible
```

## Orden

La estructura prevista para completar el flujo transaccional es:

```text
Orden
├── id
├── comprador_id
├── total
├── estado
├── codigo_confirmacion
├── operationKey
└── created_at
```

La documentación define estos datos como parte del modelo de órdenes del MVP.

---

# Seguridad

El proyecto utiliza Supabase Auth y debe implementar políticas **Row Level Security (RLS)** para garantizar que los usuarios solamente puedan modificar o eliminar sus propias publicaciones.

También debe garantizarse que los endpoints públicos no expongan información personal sensible de vendedores particulares.

Estos requisitos forman parte de los requisitos no funcionales del proyecto.

### Estado actual

* Autenticación con Supabase: implementada.
* Asociación de publicaciones al usuario: implementada.
* Protección completa de rutas: pendiente de verificación final.
* Políticas RLS: pendientes de verificación/configuración final.

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

El proyecto cuenta actualmente con una parte importante del MVP implementada:

* Autenticación.
* Catálogo.
* Búsqueda.
* Categorías.
* Filtros por talle.
* Detalle de productos.
* Alta de prendas.
* Imágenes opcionales.
* Gestión de publicaciones.
* Control de stock.
* Carrito global con Zustand.
* Persistencia del carrito con AsyncStorage.

Los principales puntos pendientes para completar el First Delivery son:

1. Protección definitiva de rutas.
2. Verificación y configuración de RLS.
3. Checkout.
4. Selección de retiro/envío.
5. Método de pago lógico.
6. Resumen con comisión y total.
7. Generación de órdenes.
8. Código único de confirmación.
9. Idempotencia mediante `operationKey`.
10. Geolocalización y fallback manual.

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
