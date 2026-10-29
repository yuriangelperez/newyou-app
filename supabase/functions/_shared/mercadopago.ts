// Lo que comparten pago-mercadopago y mp-webhook: llamadas a la API de Mercado Pago
// y el paso del estado del pago a la compra (RPC registrar_pago_mp, sólo service_role).
import type { SupabaseClient } from 'npm:@supabase/supabase-js@2';

export const MP_API = 'https://api.mercadopago.com';

export type EstadoPago = 'pendiente' | 'aprobado' | 'rechazado' | 'cancelado';

export interface PagoMp {
  id: number;
  status: string;
  status_detail?: string;
  external_reference?: string | null;
  date_created?: string;
}

export function tokenMp() {
  const token = Deno.env.get('MP_ACCESS_TOKEN');
  if (!token) throw new Error('Falta el secreto MP_ACCESS_TOKEN en Supabase');
  return token;
}

export async function llamarMp<T>(ruta: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${MP_API}${ruta}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${tokenMp()}`,
      'Content-Type': 'application/json',
      ...(init.headers ?? {}),
    },
  });
  if (!res.ok) {
    throw new Error(`Mercado Pago respondió ${res.status}: ${await res.text()}`);
  }
  return (await res.json()) as T;
}

/** Estados de Mercado Pago → estado_pago de la compra. */
export function mapearEstado(status: string): EstadoPago {
  switch (status) {
    case 'approved':
      return 'aprobado';
    case 'rejected':
      return 'rechazado';
    case 'cancelled':
    case 'refunded':
    case 'charged_back':
      return 'cancelado';
    default:
      // pending, in_process, authorized: todavía se puede acreditar.
      return 'pendiente';
  }
}

/** Pagos de una compra (external_reference = compraid), el más nuevo primero. */
export async function buscarPagos(compraid: number) {
  const datos = await llamarMp<{ results: PagoMp[] }>(
    `/v1/payments/search?external_reference=${compraid}&sort=date_created&criteria=desc`,
  );
  return datos.results ?? [];
}

/**
 * Consulta a Mercado Pago cómo quedó el pago de la compra y lo guarda.
 * Si hay varios intentos, gana el aprobado; si no, el último.
 */
export async function sincronizarCompra(admin: SupabaseClient, compraid: number) {
  const pagos = await buscarPagos(compraid);
  const pago = pagos.find((p) => p.status === 'approved') ?? pagos[0];
  if (!pago) return null;
  return registrarPago(admin, compraid, mapearEstado(pago.status), String(pago.id));
}

export async function registrarPago(
  admin: SupabaseClient,
  compraid: number,
  estado: EstadoPago,
  paymentId?: string | null,
  preferenceId?: string | null,
) {
  const { data, error } = await admin.rpc('registrar_pago_mp', {
    p_compra: compraid,
    p_estado: estado,
    p_payment_id: paymentId ?? null,
    p_preference_id: preferenceId ?? null,
  });
  if (error) throw new Error(error.message);
  return data as { compraid: number; estado_pago: string };
}
