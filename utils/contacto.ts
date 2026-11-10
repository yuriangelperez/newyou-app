/**
 * Detecta teléfonos, mails, links y redes en un texto, para que la venta no salga de la app.
 * Copia de contiene_datos_contacto() (23-preguntas.sql): el servidor vuelve a verificarlo.
 */
const PATRONES: RegExp[] = [
  /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i,
  /(https?:\/\/|www\.)/i,
  /\b[a-z0-9-]+\.(com|ar|net|org|me)\b/i,
  /(\d[ .-]?){8,}/,
  /\b(whats ?app|wsp|wpp|telegram|instagram)\b/i,
];

export const AVISO_DATOS_CONTACTO = 'Por seguridad no se pueden compartir teléfonos, mails, redes ni links.';

export function contieneDatosContacto(texto: string) {
  return PATRONES.some((patron) => patron.test(texto));
}
