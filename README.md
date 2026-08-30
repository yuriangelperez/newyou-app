# NEW YOU - Documentacion del Proyecto Integrador

NEW YOU es una aplicacion movil de moda circular desarrollada para la materia Aplicaciones Moviles y Testing (Tecnicatura Superior en Desarrollo de Software, UNP, ciclo 2026).

Este README deja explicito:
- el estado actual implementado en el repositorio,
- el roadmap proximo del equipo,
- y la vision funcional objetivo del producto.

## Equipo del proyecto

- Yuriangel Perez (Desarrolladora / Scrum Master)
- Daiana Lencina (Product Owner / Desarrolladora)
- Alejandro Terzano (Disenador / Desarrollador)
- Guillermo Nicolas Moreyra Montiel (Desarrollador)
- Lucila Sanchez (Desarrolladora)
- Carlos Semeco (Modelador de datos / Desarrollador)

## Propuesta de valor (vision del producto)

La aplicación propone resolver de manera mobile un modelo de negocios híbrido de moda circular de prendas de segunda mano y colecciones de tiendas de diseño:

1.  **B2C (Business to Consumer):** Tiendas de diseño locales asociadas publican y comercializan de forma directa sus colecciones de prendas nuevas en la plataforma.
2.  **C2C (Consumer to Consumer):** Un marketplace circular donde los usuarios particulares publican prendas usadas de su propio ropero (segunda mano) fomentando la sustentabilidad, el reciclaje textil y la economía circular. Dichas publicaciones deven de pasar por una verificacion antes de ser publicadas.
3.  **Monetización por Comisión:** La plataforma cobra un porcentaje de comisión automatizado sobre las transacciones de compra-venta C2C, garantizando la sostenibilidad financiera del servicio.

## Estado actual del desarrollo (real del repo)

### Stack realmente instalado hoy

- Expo SDK 57
- React Native 0.86
- React 19
- TypeScript
- Expo Router
- Expo Asset

Dependencias confirmadas en `package.json`:
- `expo`
- `expo-router`
- `react-native`
- `typescript`
- (entre otras basicas de Expo)

Aun no estan instalados en este repo:
- Zustand
- Firebase Auth / Firestore
- Zod
- React Hook Form
- modulos de camara/geolocalizacion

## Mapa de Pantallas y Arquitectura de Navegación

El flujo de usuario de **NEW YOU** consta de **8 pantallas esenciales** mapeadas directamente con la estructura de archivos físicos de **Expo Router**:

1.  **`app/(auth)/login.tsx` (Login):** Pantalla de ingreso protegida mediante Firebase Auth con inputs estilizados de usuario, contraseña y enlace para recuperar contraseña o registrarse.
2.  **`app/(auth)/register.tsx` (Registro):** Formulario de alta de usuario con validación de coincidencia de contraseñas. Redirige al inicio tras el alta exitosa.
3.  **`app/(tabs)/index.tsx` (Home / Catálogo):** Pantalla principal. Presenta una cabecera de marca con el logotipo del proyecto, un banner carrusel superior horizontal de prendas destacadas, y una grilla eficiente de 2 columnas (`FlatList`) que renderiza las tarjetas de prendas con pull-to-refresh nativo y conditional rendering.
4.  **`app/producto/[id].tsx` (Detalle de Prenda):** Vista detallada de la prenda. Muestra imagen grande del artículo, descripción de lino o denim, talles disponibles interactivos, precio destacado y botón para agregar al carrito gestionado por Zustand.
5.  **`app/(tabs)/carrito.tsx` (Carrito):** Listado dinámico de artículos agregados. Permite modificar cantidades, calcular subtotales y total general en tiempo real, e iniciar el checkout.
6.  **`app/producto/nuevo.tsx` (CRUD Alta):** Formulario para subir una prenda (B2C/C2C). Permite capturar la foto con la cámara nativa del celular, validar los campos numéricos y guardar el producto en el catálogo.
7.  **`app/checkout/index.tsx` (Pago y Envío):** Selección del método de envío (retiro o delivery) y método de pago (transferencia o tarjeta), confirmando la compra.
8.  **`app/(tabs)/perfil.tsx` (Perfil):** Datos de cuenta del usuario activo, visualización de sus productos publicados para la venta circular y botón de cierre de sesión.


Funcionalidades visibles actualmente:
- Login y registro con navegacion basica (sin autenticacion real).
- Home con:
  - carrusel horizontal de destacados,
  - grilla de productos en 2 columnas,
  - pull-to-refresh,
  - renderizado condicional de stock (`Agregar` / `Agotado`),
  - opacidad reducida para productos no disponibles.
- Barra inferior visual custom (iconos), aun sin navegacion funcional a otras secciones.

### Datos y capas disponibles

- Tipos de dominio en `types/index.ts` (`Producto`, `Usuario`).
- Mock de catalogo en `data/mockData.ts` (6 productos).
- Hook de negocio `hooks/useProductos.ts` con simulacion asincrona de 1 segundo.
- Tokens visuales en `constants/theme.ts`.

### Estado de carpetas

- `components/`: vacia (pendiente de extraer UI reutilizable).
- `services/`: vacia (pendiente integraciones externas).

## Roadmap inmediato (proximo sprint)

Se planea incorporar:
- estado global de carrito (Zustand),
- validacion de formularios (Zod + React Hook Form),
- autenticacion/persistencia (Firebase),
- acceso a camara y geolocalizacion.

## Sistema de diseno (alineado al codigo actual)

Archivo fuente: `constants/theme.ts`.

### Colores definidos actualmente

*   `Colors.primary` (`#493628` - Café Chocolate): Color de marca para destaques principales, botones activos, header de la HomeScreen y títulos fuertes.
*   `Colors.secondary` (`#AB8970` - Café con Leche): Color para subtítulos de marca, detalles secundarios, bordes activos e íconos inactivos.
*   `Colors.background` (`#E7DEDF` - Crema Suave): Color de fondo general del viewport de la aplicación y SafeAreas.
*   `Colors.surface` (`#D7BFB3` - Crema Medio): Color para contenedores flotantes, tarjetas de prendas, campos de texto e inputs de login/registro.
*   `Colors.text` (`#1F1E1E` - Negro Suave): Color principal para textos de lectura, descripciones de prendas y etiquetas de contraste alto.
*   `Colors.textMuted` (`#64748B` - Gris Neutro): Usado para subtítulos, placeholders de inputs y descripciones de soporte secundario.
*   `Colors.border` (`#E4E0E1` - Gris Claro): Para líneas divisoras, bordes de inputs y separadores de la FlatList.
*   `Colors.success` (`#22C55E` - Verde): Para badges interactivos de stock "Disponible" y confirmaciones de pago exitoso.
*   `Colors.danger` (`#EF4444` - Rojo): Para warnings de stock "Agotado", validación de errores en formularios de alta y alertas de sesión.

### Escalas

- Spacing: `xs=4`, `sm=8`, `md=16`, `lg=24`, `xl=32`, `xxl=48`
- FontSize: `xs=11`, `sm=12`, `md=14`, `lg=16`, `xl=20`, `xxl=24`, `xxxl=32`
- Radius: `sm=4`, `md=8`, `lg=12`, `full=999`

## QA checklist para el avance actual

1. Pull-to-refresh en Home refresca con retraso simulado de 1 segundo.
2. Producto con `disponible: false` se muestra con opacidad y boton deshabilitado.
3. Carrusel de destacados cambia indicador de pagina al deslizar.
4. Navegacion basica entre login, registro y home responde sin errores.

## Como ejecutar

```bash
npm install
npm run start
```

Luego abrir en Expo Go:
- `a` para Android
- `w` para Web

