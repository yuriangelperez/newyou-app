# Testware de New You

Todo el material de pruebas del proyecto, organizado según la clase 7 de Testing y Calidad
(Documentación y Testware) y la clase 6 (Depuración y herramientas de soporte).

| Artefacto | Dónde está | Criterio de la cátedra |
| --- | --- | --- |
| Plan y estrategia | este archivo, secciones 1 y 2 | A1, A2 |
| Historias de usuario y criterios Gherkin | [`features/`](features/) | A4, A5 |
| Casos de prueba (feliz, negativo, límite) | escenarios `@F`, `@N`, `@L` de cada `.feature` | A6 |
| Matriz de trazabilidad bidireccional (RTM) | sección 3 | A7 |
| Pruebas unitarias y de componentes | [`__tests__/`](../../__tests__/) (Jest + RNTL, 65 pruebas) | D, B1 |
| Pruebas E2E móviles | [`.maestro/`](../../.maestro/) (Maestro) | D1 |
| Pruebas de API | [`postman/`](postman/) (Postman + Newman) | D2, D3, D4 |
| Prueba de carga | [`jmeter/catalogo.jmx`](jmeter/catalogo.jmx) (JMeter) | D5, B2 |
| Integración continua | [`.github/workflows/test.yml`](../../.github/workflows/test.yml) | D3 |
| Bug tracker | GitHub Issues con la plantilla [`bug`](../../.github/ISSUE_TEMPLATE/bug.md) | C1, C2 |
| Cronograma PERT / Gantt | [`../planificacion/cronograma.md`](../planificacion/cronograma.md) | E3, E4 |

## 1. Estrategia

Pirámide de pruebas: la mayoría son unitarias (servicios, stores, esquemas Zod y hooks con el
backend mockeado), una capa de componentes con React Native Testing Library, la API se prueba con
Postman y los flujos críticos de punta a punta con Maestro en un celular o emulador.

| Nivel | Herramienta | Qué cubre | Cuándo corre |
| --- | --- | --- | --- |
| Unitarias | Jest + jest-expo | reglas de negocio, sesión, interceptor, notificaciones | cada push y PR (CI) |
| Componentes | RNTL | TarjetaProducto, useProductos | cada push y PR (CI) |
| API | Postman / Newman | auth, CRUD, RLS, negativos, concurrencia, tiempos | antes de cada entrega |
| E2E móvil | Maestro | login, registro, carrito, checkout, favoritos | antes de cada entrega, con el `.apk` de preview |
| Carga | JMeter | catálogo con 50 usuarios | una vez por entrega |
| Manual | celular real | cámara, GPS, notificaciones, push, TalkBack | antes de cada entrega |

Entornos: proyecto de Supabase de desarrollo (nunca el de producción), `.apk` del perfil
`preview` de EAS y la versión web (`npm run web`). Datos de prueba: dos cuentas `particular` y una
`comprador` creadas para las pruebas (sus contraseñas van en el environment de Postman y en las
variables de Maestro, no en el repositorio).

## 2. Ciclo de vida

1. **Planificación:** esta estrategia y el cronograma.
2. **Diseño:** cada HU tiene criterios Gherkin y de ahí salen los casos `TC-HUxx-nn`.
3. **Ejecución:** CI en cada push; Postman, Maestro y pruebas manuales antes de cada entrega. Cada
   falla se carga como issue con la plantilla de bug y se enlaza en la RTM.
4. **Cierre:** al final de cada entrega se completan las métricas de la sección 5.

## 3. Matriz de trazabilidad (RTM)

Hacia adelante: cada HU tiene al menos un caso. Hacia atrás: cada bug apunta a su caso y a su HU.
Estado: ✅ pasa · 🔁 automatizado en CI · 🖐️ manual · ⏳ pendiente de ejecutar.

| HU | Criterio | Caso | Tipo | Automatización | Estado | Bug |
| --- | --- | --- | --- | --- | --- | --- |
| HU01 | Registro válido | TC-HU01-01 | F | Postman `auth/registro` | ⏳ | |
| HU01 | Contraseñas distintas | TC-HU01-02 | N | Jest `authSchemas`, Maestro 03 | 🔁 | |
| HU01 | Reglas de contraseña | TC-HU01-03 | L | Jest `authSchemas`, Maestro 03 | 🔁 | |
| HU02 | Login correcto | TC-HU02-01 | F | Postman `auth/login`, Maestro `_login` | ⏳ | |
| HU02 | Credenciales inválidas | TC-HU02-02 | N | Postman `auth/login inválido`, Maestro 02 | ⏳ | |
| HU02 | Correo inválido | TC-HU02-03 | N | Jest `authSchemas`, Maestro 01 | 🔁 | |
| HU02 | Sesión cifrada | TC-SES-01 | F | Jest `secureSessionStorage` | 🔁 | |
| HU02 | Token vencido → renovar o salir | TC-SES-02 | L | Jest `interceptor` | 🔁 | |
| HU02 | Ruta protegida sin sesión | TC-SES-03 | N | manual (web) | 🖐️ | BUG-06 ✅ |
| HU03 | Catálogo carga | TC-HU03-01 | F | Jest `useProductos`, Postman `productos/listar` | 🔁 | |
| HU03 | Error de red | TC-HU03-02 | N | Jest `useProductos` | 🔁 | |
| HU03 | Catálogo vacío | TC-HU03-03 | L | manual | 🖐️ | |
| HU04 | Búsqueda | TC-HU04-01 | F | Maestro 04 | ⏳ | |
| HU04 | Sin resultados | TC-HU04-02 | L | manual | 🖐️ | |
| HU04 | Promociones | TC-HU04-03 | F | manual | 🖐️ | |
| HU05 | Detalle y favorito | TC-HU05-01 | F | Maestro 06 | ⏳ | |
| HU06 | Publicar con foto | TC-HU06-01 | F | manual en celular | 🖐️ | |
| HU06 | Datos inválidos | TC-HU06-02 | N | Jest `productoSchema` | 🔁 | |
| HU06 | Sexta imagen | TC-HU06-03 | L | Jest `productoSchema` | 🔁 | |
| HU06 | Permiso de cámara denegado | TC-HW-01 | N | manual en celular | 🖐️ | |
| HU06 | Recordatorio local | TC-HW-02 | F | Jest `notificaciones` | 🔁 | |
| HU07 | Stock por sede | TC-HU07-01 | F | Jest `empresas` | 🔁 | |
| HU08 | Borrar deslizando | TC-HU08-01 | F | manual en celular | 🖐️ | BUG-05 ✅ |
| HU08 | Editar prenda ajena | TC-HU08-02 | N | Postman `negativos/editar ajeno` | ⏳ | BUG-01 ✅, BUG-02 ✅ |
| HU09 | Agregar | TC-HU09-01 | F | Jest `useCarritoStore`, RNTL `TarjetaProducto` | 🔁 | |
| HU09 | No superar el stock | TC-HU09-02 | L | Jest `useCarritoStore` | 🔁 | BUG-08 ✅ |
| HU10 | Cambiar cantidades | TC-HU10-01 | F | Jest `useCarritoStore`, Maestro 04 | 🔁 | |
| HU11 | Retiro gratis | TC-HU11-01 | F | Jest `pedidos` (`calcularEnvio`) | 🔁 | |
| HU12 | Medio de pago | TC-HU12-01 | F | Maestro 05 | ⏳ | |
| HU13 | Resumen con descuento | TC-HU13-01 | F | Jest `useCarritoStore`, RNTL `TarjetaProducto` | 🔁 | BUG-04 ✅ |
| HU14 | Confirmar compra | TC-HU14-01 | F | Postman `checkout/confirmar`, Maestro 05 | ⏳ | BUG-03 ✅ |
| HU14 | Idempotencia | TC-HU14-02 | L | Postman `concurrencia` | ⏳ | BUG-03 ✅ |
| HU16 | Sin conexión | TC-HU16-01 | N | manual (modo avión) | 🖐️ | |
| HU20 | Agotado | TC-HU20-01 | F | RNTL `TarjetaProducto`, Jest `useCarritoStore` | 🔁 | |
| Push | Activar | TC-PUSH-01 | F | manual (build de EAS) | 🖐️ | |
| Push | Venta nueva | TC-PUSH-02 | F | manual (2 celulares) | 🖐️ | |
| Push | Cambio de estado | TC-PUSH-03 | F | manual + Jest `pedidos` | 🖐️ | |
| Push | Cerrar sesión | TC-PUSH-04 | N | manual | 🖐️ | |
| Push | Simulador / Expo Go | TC-PUSH-05 | L | manual | 🖐️ | |

HU15 (chat) y HU19 (modo oscuro) quedan fuera de esta entrega, por lo que no tienen casos todavía.

### Defectos

| Bug | Severidad | Resumen | HU / TC | Estado | Causa raíz (RCA) |
| --- | --- | --- | --- | --- | --- |
| BUG-01 | Alta | Cualquier vendedor veía Editar/Eliminar en prendas ajenas | HU08 / TC-HU08-02 | Cerrado | la UI sólo miraba el rol; ahora `usePuedeGestionarProducto` mira el dueño |
| BUG-02 | Alta | Editar/borrar dependían sólo de RLS sin políticas | HU08 / TC-HU08-02 | Cerrado | faltaban políticas; migraciones 05 y 08 |
| BUG-03 | Alta | La compra no descontaba stock ni era idempotente | HU14 / TC-HU14-01, 02 | Cerrado | lógica en el cliente; ahora `confirmar_compra` con `operation_key` |
| BUG-04 | Media | Totales calculados en el cliente | HU13 / TC-HU13-01 | Cerrado | mismo origen que BUG-03 |
| BUG-05 | Media | En la web confirmar y eliminar no hacían nada | HU08 / TC-HU08-01 | Cerrado | `Alert.alert` con botones no existe en react-native-web; se usa `confirmar()` |
| BUG-06 | Media | No había protección de rutas | HU02 / TC-SES-03 | Cerrado | guardia en `app/_layout.tsx` |
| BUG-07 | Baja | Jeans y Pantalones comparten el ID de categoría 2 | HU04, HU06 | Cerrado | mapa fijo en `productosService.ts`; ahora las categorías se leen de la tabla `categorias` (`useCategorias`) |
| BUG-08 | Baja | El carrito usaba un stock congelado | HU09 / TC-HU09-02 | Cerrado | el servidor revalida el stock al confirmar |
| BUG-09 | Media | En el detalle, el color elegido se pisaba en cada render si la prenda no tenía colores | HU05 / TC-HU05-01 | Cerrado | efecto que dependía de un arreglo nuevo en cada render; detectado por ESLint |

## 4. Listas de comprobación

### Peer review de cada caso de prueba

- [ ] ¿Está trazado a un criterio de aceptación?
- [ ] ¿Las precondiciones y los datos de prueba están definidos?
- [ ] ¿Los pasos se reproducen sin ambigüedad?
- [ ] ¿Incluye escenarios negativos y de valores límite?
- [ ] ¿El resultado esperado es medible?

### Calidad del producto (ISO/IEC 25010)

| Característica | Cómo se verifica en New You |
| --- | --- |
| Adecuación funcional | ejecutar la RTM; todas las HU del MVP con al menos un caso que pasa |
| Eficiencia de desempeño | Postman: catálogo en menos de 1,5 s; JMeter: p95 y tasa de error con 50 usuarios; FlashList y `React.memo` en listas |
| Compatibilidad | Maestro en Android, la versión web en Chrome y Firefox, y iOS en simulador |
| Usabilidad / accesibilidad | TalkBack o VoiceOver: los botones sin texto (barra inferior, favorito, cantidades) tienen `accessibilityLabel` |
| Seguridad | JWT en SecureStore, interceptor ante 401, RLS en todas las tablas (Postman `negativos`), claves fuera del repositorio |

### Verificación y validación

- **Verificación:** RTM y CI en verde.
- **Validación (UAT):** un comprador y un vendedor reales usan el `.apk` de preview; registrar quién,
  cuándo y el resultado en el issue de la entrega.

## 5. Gestión de defectos y métricas

Ciclo de vida de un bug en GitHub Issues: reportado → asignado → priorizado (etiqueta de
severidad) → en depuración → corregido (PR que lo cierra) → confirmado (re-test del TC) → cerrado.
Cada bug sigue los 4 pasos de depuración: reproducir con los mismos datos, diagnosticar el módulo,
corregir la causa raíz y volver a correr el caso y la suite de regresión.

Métricas por entrega (completar al cierre):

| Métrica | Fórmula | Valor |
| --- | --- | --- |
| Densidad de defectos | bugs encontrados / KLOC | |
| NOEL (errores que quedan) | estimación por siembra o tendencia de bugs por semana | |
| ETTF (tiempo estimado de corrección) | promedio de horas desde "asignado" a "corregido" | |
| Casos ejecutados / pasados | de la RTM | |
| Cobertura de código | `npm test -- --coverage` | |
