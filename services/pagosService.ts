import { DatosTarjeta } from '../utils/tarjeta';
import { MedioPago } from './comprasService';
import { supabase } from './supabase';

/** Medios que se cobran en línea: tarjetas (API propia) y Mercado Pago (Checkout Pro). */
export const MEDIOS_ONLINE: MedioPago[] = ['Tarjeta de crédito', 'Tarjeta de débito', 'Mercado Pago'];

/**
 * Recargo por pagar con tarjeta de crédito (cubre el costo de procesarla). Es sólo
 * para mostrarlo: el que cobra es confirmar_compra, con comision_tarjeta_credito() (19-pagos-mercadopago.sql).
 */
export const COMISION_CREDITO = 0.06;

export type EstadoPago = 'no_aplica' | 'pendiente' | 'aprobado' | 'rechazado' | 'cancelado';

/** Cómo volvió el navegador del Checkout Pro (back_urls de la preferencia). */
export type RetornoPago = 'aprobado' | 'pendiente' | 'rechazado';

export interface PagoIniciado {
  /** Link del Checkout Pro de Mercado Pago. */
  url: string;
  /** URL de regreso: al navegar ahí, el pago terminó. */
  retorno: string;
}

export function esPagoOnline(medio: MedioPago) {
  return MEDIOS_ONLINE.includes(medio);
}

/** Tipo de tarjeta que acepta el medio, o null si no es un pago con tarjeta. */
export function tipoTarjeta(medio: MedioPago): 'credito' | 'debito' | null {
  if (medio === 'Tarjeta de crédito') return 'credito';
  if (medio === 'Tarjeta de débito') return 'debito';
  return null;
}

/** Comisión estimada sobre productos + envío; redondea igual que el servidor. */
export function calcularComision(medio: MedioPago, base: number) {
  return medio === 'Tarjeta de crédito' ? Math.round(base * COMISION_CREDITO) : 0;
}

export interface ResultadoTarjeta {
  estado: EstadoPago;
  /** Motivo en español cuando el pago no se aprobó. */
  detalle?: string | null;
  /** Total cobrado (con el interés de las cuotas) e interés sumado. */
  total?: number;
  interes?: number;
  cuotas?: number;
}

/**
 * Si `url` es la página de regreso del Checkout Pro devuelve cómo terminó el pago;
 * si no, null (es una página más de Mercado Pago).
 */
export function resultadoDeRetorno(url: string, retorno: string): RetornoPago | null {
  if (!url.startsWith(retorno)) {
    return null;
  }
  const valor = url.match(/[?&]retorno=([a-z]+)/)?.[1];
  return valor === 'aprobado' || valor === 'pendiente' ? valor : 'rechazado';
}

/** Llama a una Edge Function de pagos y devuelve su mensaje de error si falla. */
async function invocarPago<T>(
  funcion: 'pago-mercadopago' | 'pago-tarjeta',
  accion: 'crear' | 'pagar' | 'verificar' | 'cancelar',
  compraid: number,
  extra: Record<string, unknown> = {},
): Promise<T> {
  const { data, error } = await supabase.functions.invoke(funcion, {
    body: { accion, compraid, ...extra },
  });

  if (error) {
    // El cuerpo del error trae el motivo en español (ej. falta MP_ACCESS_TOKEN).
    const cuerpo = await (error as { context?: Response }).context?.json?.().catch(() => null);
    throw new Error(cuerpo?.error ?? error.message);
  }

  return data as T;
}

/** Crea la preferencia de pago de una compra ya registrada con confirmar_compra. */
export function crearPagoMp(compraid: number) {
  return invocarPago<PagoIniciado>('pago-mercadopago', 'crear', compraid);
}

/** Cobra la compra con la API de tarjetas propia (Edge Function `pago-tarjeta`). */
export function pagarConTarjeta(compraid: number, tarjeta: DatosTarjeta) {
  return invocarPago<ResultadoTarjeta>('pago-tarjeta', 'pagar', compraid, { tarjeta });
}

/** El comprador cerró el formulario de tarjeta: anula la compra y devuelve el stock. */
export async function cancelarPagoTarjeta(compraid: number) {
  const { estado } = await invocarPago<{ estado: EstadoPago }>('pago-tarjeta', 'cancelar', compraid);
  return estado;
}

/** Pregunta a Mercado Pago cómo quedó el pago y lo guarda en la compra. */
export async function verificarPagoMp(compraid: number) {
  const { estado } = await invocarPago<{ estado: EstadoPago }>('pago-mercadopago', 'verificar', compraid);
  return estado;
}

/**
 * El comprador abandonó el pago: anula la compra y devuelve el stock. Si en el medio
 * el pago se aprobó (o quedó en revisión), devuelve ese estado y la compra sigue.
 */
export async function cancelarPagoMp(compraid: number) {
  const { estado } = await invocarPago<{ estado: EstadoPago }>('pago-mercadopago', 'cancelar', compraid);
  return estado;
}
