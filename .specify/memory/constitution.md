# Constitución de New You

Estándares que todo agente de IA (Gemini en Antigravity, Claude, Copilot) y todo integrante del
equipo respeta al especificar, planificar e implementar con Spec Kit (Clase 13: Spec-Driven
Development). No se escribe código de una funcionalidad nueva sin `spec.md`, `plan.md` y `tasks.md`
aprobados en `specs/NNN-nombre/`.

## Principios

### I. Especificación antes que código

Cada funcionalidad nace de una historia de usuario del Product Backlog (HU01–HU20) o de una entrega
de la cátedra. `/speckit.specify` describe el qué y el porqué con criterios de aceptación
verificables; `/speckit.plan` decide el cómo. Nada de "vibe coding": si la spec no lo dice, no se
implementa (evita el *gold plating*).

### II. Stack fijo (no negociable)

- Expo SDK 57 con Expo Router y TypeScript estricto. Antes de usar una API de Expo se leen los docs
  versionados en https://docs.expo.dev/versions/v57.0.0/ y las dependencias se instalan con
  `npx expo install`.
- Estado global con Zustand; formularios con React Hook Form + Zod (esquemas en `schemas/`).
- Backend Supabase (Auth, PostgreSQL con RLS, Storage, Realtime). La UI nunca importa Supabase:
  pantallas → hooks → `services/`.
- Listas con FlashList y componentes de fila con `React.memo`; animaciones con Reanimated.
- Hardware con módulos de Expo y el hook `usePermission` (el permiso se pide al tocar el botón).

### III. Seguridad por defecto

- La sesión y el JWT van en SecureStore, nunca en AsyncStorage.
- Toda tabla nueva lleva RLS y políticas en una migración numerada de `supabase/migraciones/`.
- Las operaciones con dinero o stock se hacen en funciones de PostgreSQL (`SECURITY DEFINER`), no
  en el cliente, y son idempotentes.
- Ninguna clave en el repositorio: `.env` local y variables de entorno de EAS.

### IV. Calidad verificable

- Cada criterio de aceptación se escribe en Gherkin en `docs/testing/features/` y entra en la RTM
  de `docs/testing/README.md` con al menos un caso feliz, uno negativo y uno límite.
- La lógica nueva viene con pruebas de Jest; los componentes, con React Native Testing Library; los
  flujos críticos, con un flujo de Maestro.
- `npx tsc --noEmit`, `npm run lint` y `npm test` en verde en CI antes de mergear.

### V. Accesibilidad y web

Todo botón sin texto tiene `accessibilityRole` y `accessibilityLabel`; los controles críticos tienen
`testID`. La app también corre en la web: nada de `Alert.alert` con botones (usar `confirmar()`),
y los módulos sólo nativos tienen su variante `.web.tsx`.

## Idioma y estilo

Código, comentarios, mensajes de commit y textos de la UI en español rioplatense (vos). Los
comentarios explican el porqué, no el qué.

## Flujo de trabajo

1. `/speckit.specify` → `specs/NNN-nombre/spec.md` (HU, escenarios, requisitos, criterios de éxito).
2. `/speckit.clarify` si quedan dudas; `/speckit.plan` → `plan.md` con el chequeo de esta constitución.
3. `/speckit.tasks` → `tasks.md`; `/speckit.implement` tarea por tarea, en una rama `feature/...`.
4. PR con video o capturas si toca hardware, revisión de al menos un integrante y CI en verde.

## Gobierno

Esta constitución prevalece sobre cualquier otra práctica del repositorio. Cambiarla requiere un PR
propio, aprobado por el equipo, que suba la versión.

**Versión**: 1.0.0 | **Ratificada**: 2026-10-24 | **Última modificación**: 2026-10-24
