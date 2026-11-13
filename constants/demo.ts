/**
 * Versión demo de la presentación (rama demo, perfil "demo" de EAS y web /newyou-app/demo/),
 * activada con EXPO_PUBLIC_MP_MODO=demo:
 * - Mercado Pago simulado dentro de la app (sin cuenta de Mercado Pago).
 * - El formulario de tarjeta sólo ofrece tarjetas de prueba, con los datos fijos.
 * - En la web, franja con el botón "Descargar APK".
 * Sin la variable se usa el Checkout Pro real de Mercado Pago (credenciales de prueba).
 * Está aparte de pagosService para que los componentes no carguen el cliente de Supabase.
 */
export const MP_MODO_DEMO = process.env.EXPO_PUBLIC_MP_MODO === 'demo';

/**
 * Cuentas compartidas del botón "Entrar como invitado" (sólo en la versión demo), para que en
 * la presentación cualquiera pruebe la app sin registrarse, eligiendo cómo quiere entrar.
 * Son cuentas normales de Supabase creadas para la demo: estos datos quedan dentro de la app,
 * no usar cuentas reales. Una cuenta sin correo o contraseña no se ofrece.
 * Son las cuentas de prueba de la tabla 1.1 del documento MVP.
 * - comprador: cuenta común, sin publicaciones.
 * - particular: vende como persona (tiene prendas publicadas).
 * - empresa: dueña de una empresa con sus sedes y catálogo.
 */
export type TipoInvitado = 'comprador' | 'particular' | 'empresa';

export interface CuentaInvitado {
  tipo: TipoInvitado;
  etiqueta: string;
  detalle: string;
  correo: string;
  contrasena: string;
}

export const CUENTAS_INVITADO: CuentaInvitado[] = [
  {
    tipo: 'comprador',
    etiqueta: 'Comprador',
    detalle: 'Explorá, guardá favoritos y comprá.',
    correo: process.env.EXPO_PUBLIC_DEMO_COMPRADOR_CORREO || 'newyou.testing+compradordemo@gmail.com',
    contrasena: process.env.EXPO_PUBLIC_DEMO_COMPRADOR_CONTRASENA || 'Demo123',
  },
  {
    tipo: 'particular',
    etiqueta: 'Vendedor particular',
    detalle: 'Publicá prendas y mirá tus ventas.',
    correo: process.env.EXPO_PUBLIC_DEMO_PARTICULAR_CORREO || 'newyou.testing+vendedordemo@gmail.com',
    contrasena: process.env.EXPO_PUBLIC_DEMO_PARTICULAR_CONTRASENA || 'Demo123',
  },
  {
    tipo: 'empresa',
    etiqueta: 'Empresa',
    detalle: 'Tienda, sedes, equipo y métricas.',
    correo: process.env.EXPO_PUBLIC_DEMO_EMPRESA_CORREO || 'newyou.testing+empresademo@gmail.com',
    contrasena: process.env.EXPO_PUBLIC_DEMO_EMPRESA_CONTRASENA || 'Demo123',
  },
].filter((cuenta) => cuenta.correo !== '' && cuenta.contrasena !== '') as CuentaInvitado[];

export const INVITADO_DISPONIBLE = MP_MODO_DEMO && CUENTAS_INVITADO.length > 0;

/**
 * Cuenta compartida del botón "Entrar como invitado". En éstas no se ofrece cambiar el tipo de
 * cuenta ni crear o unirse a una empresa, así la cuenta queda igual para el próximo que la use.
 */
export function esCuentaInvitado(correo?: string | null) {
  if (!INVITADO_DISPONIBLE || !correo) return false;
  const buscado = correo.trim().toLowerCase();
  return CUENTAS_INVITADO.some((cuenta) => cuenta.correo.trim().toLowerCase() === buscado);
}
