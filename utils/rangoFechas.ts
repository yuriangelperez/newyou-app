// Rangos de fechas de Métricas: Hoy, Esta semana (desde el lunes), Este mes, Este año y personalizado.
// Las fechas viajan como "AAAA-MM-DD" en la hora del celular; el servidor cuenta en hora argentina.

export type PeriodoMetricas = 'hoy' | 'semana' | 'mes' | 'anio' | 'personalizado';

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
  if (periodo === 'anio') {
    return { desde: fechaISO(new Date(hoy.getFullYear(), 0, 1)), hasta };
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

export type AgrupacionIngresos = 'hora' | 'dia' | 'semana' | 'mes';

export interface BarraIngresos {
  etiqueta: string;
  ingresos: number;
}

const MESES_CORTOS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const DIAS_CORTOS = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];

/** Cómo se divide el gráfico según el período: Hoy por hora, semana por día, mes por semana, año por mes. */
export function agrupacionDelPeriodo(periodo: PeriodoMetricas, dias: number): AgrupacionIngresos {
  if (periodo === 'hoy') return 'hora';
  if (periodo === 'semana') return 'dia';
  if (periodo === 'mes') return 'semana';
  if (periodo === 'anio') return 'mes';
  // Personalizado: se elige lo que mejor se lee según el largo del rango.
  if (dias <= 1) return 'hora';
  if (dias <= 14) return 'dia';
  if (dias <= 62) return 'semana';
  return 'mes';
}

/** "AAAA-MM-DD" del lunes de la semana de esa fecha. */
function lunesDe(iso: string): string {
  const fecha = new Date(`${iso}T00:00:00Z`);
  fecha.setUTCDate(fecha.getUTCDate() - ((fecha.getUTCDay() + 6) % 7));
  return fecha.toISOString().slice(0, 10);
}

const diaYMes = (iso: string) => iso.slice(5).split('-').reverse().join('/');

/**
 * Suma los ingresos diarios por día ("lun 26" si son pocos, si no "26/10"), por semana (de lunes a
 * domingo, etiquetada con su primer día dentro del rango) o por mes ("sep 2026"), en orden cronológico.
 */
export function agruparIngresos(
  porDia: { dia: string; ingresos: number }[],
  por: Exclude<AgrupacionIngresos, 'hora'>,
): BarraIngresos[] {
  if (por === 'dia') {
    return porDia.map((d) => {
      const diaSemana = DIAS_CORTOS[new Date(`${d.dia}T00:00:00Z`).getUTCDay()];
      return { etiqueta: porDia.length <= 14 ? `${diaSemana} ${Number(d.dia.slice(8))}` : diaYMes(d.dia), ingresos: d.ingresos };
    });
  }

  const grupos = new Map<string, { primerDia: string; ingresos: number }>();
  for (const { dia, ingresos } of porDia) {
    const clave = por === 'semana' ? lunesDe(dia) : dia.slice(0, 7);
    const grupo = grupos.get(clave) ?? { primerDia: dia, ingresos: 0 };
    grupo.ingresos += ingresos;
    grupos.set(clave, grupo);
  }

  return [...grupos.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([clave, { primerDia, ingresos }]) => ({
      etiqueta: por === 'semana' ? diaYMes(primerDia) : `${MESES_CORTOS[Number(clave.slice(5)) - 1]} ${clave.slice(0, 4)}`,
      ingresos,
    }));
}

/** Las 24 horas del día: "00h", "01h"... */
export function barrasPorHora(porHora: { hora: number; ingresos: number }[]): BarraIngresos[] {
  return porHora.map((h) => ({ etiqueta: `${dosCifras(h.hora)}h`, ingresos: h.ingresos }));
}
