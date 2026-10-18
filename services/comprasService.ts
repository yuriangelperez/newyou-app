import { CarritoItem } from '../stores/useCarritoStore';
import { supabase } from './supabase';

export type EntregaCompra = 'domicilio' | 'local';
export type MedioPago = 'Efectivo' | 'Tarjeta' | 'Mercado Pago' | 'Transferencia';

// Según el diseño, el envío a domicilio y el retiro en local son gratis.
export const COSTO_ENVIO_DOMICILIO = 0;

export interface ConfirmarCompraParams {
  operationKey: string;
  entrega: EntregaCompra;
  metodoPago: MedioPago;
  items: CarritoItem[];
  /** Domicilio del comprador o dirección de la tienda donde retira. */
  direccionEntrega?: string;
}

export interface CompraConfirmada {
  compraid: number;
  numero_orden: number;
  total: number;
}

export function generarOperationKey() {
  return `NY-ORD-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
}

export function calcularEnvio(entrega: EntregaCompra) {
  return entrega === 'domicilio' ? COSTO_ENVIO_DOMICILIO : 0;
}

/**
 * Registra la compra y descuenta el stock en una sola transacción (RPC
 * `confirmar_compra`). Reintentar con la misma `operationKey` devuelve la
 * orden ya creada en lugar de duplicarla.
 */
export async function confirmarCompra({
  operationKey,
  entrega,
  metodoPago,
  items,
  direccionEntrega,
}: ConfirmarCompraParams): Promise<CompraConfirmada> {
  const { data, error } = await supabase.rpc('confirmar_compra', {
    p_operation_key: operationKey,
    p_entrega: entrega,
    p_metodo_pago: metodoPago,
    p_envio: calcularEnvio(entrega),
    p_direccion_entrega: direccionEntrega ?? null,
    p_items: items.map((item) => ({
      productoId: item.productoId,
      nombre: item.nombre,
      precio: item.precio,
      cantidad: item.cantidad,
      talle: item.talle,
      color: item.color,
    })),
  });

  if (error) {
    throw new Error(error.message);
  }

  return data as CompraConfirmada;
}

export interface ItemHistorial {
  productoId: string;
  nombre: string;
  precio: number;
  cantidad: number;
  talle?: string;
  color?: string;
}

export interface PedidoHistorial {
  compraid: number;
  numero_orden: number;
  created_at: string;
  entrega: EntregaCompra;
  metodo_pago: string;
  items: ItemHistorial[];
  total: number;
  /** Sólo en ventas: nombre del comprador. */
  comprador?: string | null;
}

export async function obtenerMisCompras(): Promise<PedidoHistorial[]> {
  const { data, error } = await supabase
    .from('compras')
    .select('compraid, numero_orden, created_at, entrega, metodo_pago, total, items')
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map((row) => ({ ...row, total: Number(row.total) })) as PedidoHistorial[];
}

export async function obtenerMisVentas(): Promise<PedidoHistorial[]> {
  const { data, error } = await supabase.rpc('mis_ventas');

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map(
    (row: PedidoHistorial & { total_vendedor: number }) => ({
      compraid: row.compraid,
      numero_orden: row.numero_orden,
      created_at: row.created_at,
      entrega: row.entrega,
      metodo_pago: row.metodo_pago,
      items: row.items,
      total: Number(row.total_vendedor),
      comprador: row.comprador,
    }),
  );
}

export interface TiendaRetiro {
  productoId: string;
  vendedor: string;
  direccion: string | null;
}

/** Dirección de retiro de cada producto del carrito (la de su publicación). */
export async function obtenerTiendasDeRetiro(
  productoIds: string[],
): Promise<TiendaRetiro[]> {
  const { data, error } = await supabase.rpc('direcciones_retiro', {
    p_producto_ids: productoIds.map(Number),
  });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map(
    (row: { productoid: number; vendedor: string; direccion: string | null }) => ({
      productoId: String(row.productoid),
      vendedor: row.vendedor,
      direccion: row.direccion?.trim() || null,
    }),
  );
}
