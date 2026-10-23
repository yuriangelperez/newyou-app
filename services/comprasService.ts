import { CarritoItem } from '../stores/useCarritoStore';
import { supabase } from './supabase';

export type EntregaCompra = 'domicilio' | 'local';
export type MedioPago = 'Efectivo' | 'Tarjeta' | 'Mercado Pago' | 'Transferencia';


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

/**
 * Envío estimado: el costo de cada sede de empresa involucrada (una vez por sede);
 * los particulares no cobran envío. El servidor recalcula el valor final.
 */
export function calcularEnvio(entrega: EntregaCompra, tiendas: TiendaRetiro[] = []) {
  if (entrega !== 'domicilio') {
    return 0;
  }

  const costoPorSede = new Map<number, number>();
  tiendas.forEach((tienda) => {
    if (tienda.sedeId !== null) {
      costoPorSede.set(tienda.sedeId, tienda.costoEnvio);
    }
  });

  return Array.from(costoPorSede.values()).reduce((total, costo) => total + costo, 0);
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

export interface TiendaRetiro {
  productoId: string;
  vendedor: string;
  direccion: string | null;
  /** Sede de empresa (null para particulares). */
  sedeId: number | null;
  haceRetiro: boolean;
  haceEnvio: boolean;
  costoEnvio: number;
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
    (row: {
      productoid: number;
      vendedor: string;
      direccion: string | null;
      sede_id: number | null;
      hace_retiro: boolean | null;
      hace_envio: boolean | null;
      costo_envio: number | string | null;
    }) => ({
      productoId: String(row.productoid),
      vendedor: row.vendedor,
      direccion: row.direccion?.trim() || null,
      sedeId: row.sede_id ?? null,
      haceRetiro: row.hace_retiro ?? true,
      haceEnvio: row.hace_envio ?? true,
      costoEnvio: Number(row.costo_envio ?? 0),
    }),
  );
}
