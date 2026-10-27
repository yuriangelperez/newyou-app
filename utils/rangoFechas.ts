// Rangos de fechas de Métricas: Hoy, Esta semana (desde el lunes), Este mes y personalizado.
// Las fechas viajan como "AAAA-MM-DD" en la hora del celular; el servidor cuenta en hora argentina.

export type PeriodoMetricas = 'hoy' | 'semana' | 'mes' | 'personalizado';

export interface RangoFechas {
  desde: string;
  hasta: string;
}

export const DIAS_MAXIMOS_RANGO = 366;

const dosCifras = (n: number) => String(n).padStart(2, '0');

/** "2026-10-27" con la fecha local (no UTC). */
export function fechaISO(fecha: Date): string {
  return `${fecha.getFullYear()}-${dosCifras(fecha.getMonth() + 1)}-${dosCifras(fecha.getDate())}`;
}

/** "2026-10-27" → "27/10/2026". */
export function fechaArgentina(iso: string): string {
  const [anio, mes, dia] = iso.split('-');
  return `${dia}/${mes}/${anio}`;
}

export function rangoPredefinido(periodo: Exclude<PeriodoMetricas, 'personalizado'>, hoy = new Date()): RangoFechas {
  const hasta = fechaISO(hoy);
  if (periodo === 'hoy') {
    return { desde: hasta, hasta };
  }
  if (periodo === 'semana') {
    // La semana arranca el lunes: getDay() da 0 el domingo.
    const lunes = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() - ((hoy.getDay() + 6) % 7));
    return { desde: fechaISO(lunes), hasta };
  }
  return { desde: fechaISO(new Date(hoy.getFullYear(), hoy.getMonth(), 1)), hasta };
}

type ResultadoFecha = { ok: true; iso: string } | { ok: false; mensaje: string };

/** Acepta "27/10/2026" (también con guiones o un solo dígito en día y mes). */
export function parsearFechaArgentina(texto: string, campo: string): ResultadoFecha {
  const limpio = texto.trim();
  if (!limpio) {
    return { ok: false, mensaje: `Ingresá la fecha ${campo}.` };
  }

  const partes = limpio.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (!partes) {
    return { ok: false, mensaje: `La fecha ${campo} tiene que tener el formato DD/MM/AAAA.` };
  }

  const [dia, mes, anio] = [Number(partes[1]), Number(partes[2]), Number(partes[3])];
  const fecha = new Date(anio, mes - 1, dia);
  if (fecha.getFullYear() !== anio || fecha.getMonth() !== mes - 1 || fecha.getDate() !== dia) {
    return { ok: false, mensaje: `La fecha ${campo} no existe.` };
  }

  return { ok: true, iso: fechaISO(fecha) };
}

const diasEntre = (desde: string, hasta: string) =>
  Math.round((Date.parse(`${hasta}T00:00:00Z`) - Date.parse(`${desde}T00:00:00Z`)) / 86_400_000);

export type ResultadoRango = ({ ok: true } & RangoFechas) | { ok: false; mensaje: string };

/** Valida el rango personalizado: fechas reales, sin futuro, "desde" antes de "hasta" y hasta un año. */
export function validarRango(desdeTexto: string, hastaTexto: string, hoy = new Date()): ResultadoRango {
  const desde = parsearFechaArgentina(desdeTexto, 'desde');
  if (!desde.ok) return desde;
  const hasta = parsearFechaArgentina(hastaTexto, 'hasta');
  if (!hasta.ok) return hasta;

  if (hasta.iso > fechaISO(hoy)) {
    return { ok: false, mensaje: 'La fecha hasta no puede ser posterior a hoy.' };
  }
  if (desde.iso > hasta.iso) {
    return { ok: false, mensaje: 'La fecha desde tiene que ser anterior o igual a la fecha hasta.' };
  }
  if (diasEntre(desde.iso, hasta.iso) + 1 > DIAS_MAXIMOS_RANGO) {
    return { ok: false, mensaje: 'El rango puede ser de hasta un año.' };
  }

  return { ok: true, desde: desde.iso, hasta: hasta.iso };
}

/** Cantidad de días del rango, contando los dos extremos. */
export function diasDelRango(rango: RangoFechas): number {
  return diasEntre(rango.desde, rango.hasta) + 1;
}

/** "27/10/2026" o "20/10/2026 al 27/10/2026". */
export function etiquetaRango(rango: RangoFechas): string {
  return rango.desde === rango.hasta
    ? fechaArgentina(rango.desde)
    : `${fechaArgentina(rango.desde)} al ${fechaArgentina(rango.hasta)}`;
}
