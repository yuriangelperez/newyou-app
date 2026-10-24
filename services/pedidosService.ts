import { EntregaCompra } from './comprasService';
import { supabase } from './supabase';

export type EstadoPedido =
  | 'pendiente'
  | 'confirmado'
  | 'preparando'
  | 'listo_para_retirar'
  | 'enviado'
  | 'entregado'
  | 'cancelado';

export const TEXTO_ESTADO: Record<EstadoPedido, string> = {
  pendiente: 'Pendiente',
  confirmado: 'Confirmado',
  preparando: 'Preparando',
  listo_para_retirar: 'Listo para retirar',
  enviado: 'Enviado',
  entregado: 'Entregado',
  cancelado: 'Cancelado',
};

export interface ItemPedido {
  productoId: number | null;
  nombre: string;
  precio: number;
  cantidad: number;
  talle?: string | null;
  color?: string | null;
  imagen?: string | null;
}

export interface EventoPedido {
  estado: EstadoPedido;
  nota: string | null;
  fecha: string;
  actor: string | null;
}

/** Un pedido es la parte de una compra que corresponde a un vendedor (particular o sede de empresa). */
export interface Pedido {
  id: number;
  compraId: number;
  numeroOrden: number;
  createdAt: string;
  estado: EstadoPedido;
  entrega: EntregaCompra;
  metodoPago: string;
  direccionEntrega: string | null;
  subtotal: number;
  envio: number;
  total: number;
  empresaId: number | null;
  sedeId: number | null;
  /** Correo o mensajería y código de seguimiento (migración 11). */
  empresaEnvio: string | null;
  codigoSeguimiento: string | null;
  vendedor: string | null;
  comprador: string | null;
  /** Opinión del comprador (migración 12); null si todavía no calificó. */
  calificacion: Calificacion | null;
  items: ItemPedido[];
  eventos: EventoPedido[];
}

export interface Calificacion {
  id: number;
  puntaje: number;
  comentario: string | null;
  respuesta: string | null;
}

interface PedidoJson {
  id: number;
  compra_id: number;
  numero_orden: number;
  created_at: string;
  estado: EstadoPedido;
  entrega: EntregaCompra;
  metodo_pago: string;
  direccion_entrega: string | null;
  subtotal: number | string;
  envio: number | string;
  total: number | string;
  empresa_id: number | null;
  sede_id: number | null;
  empresa_envio?: string | null;
  codigo_seguimiento?: string | null;
  vendedor: string | null;
  comprador: string | null;
  calificacion?: Calificacion | null;
  items: ItemPedido[];
  eventos: EventoPedido[];
}

export const mapPedido = (row: PedidoJson): Pedido => ({
  id: row.id,
  compraId: row.compra_id,
  numeroOrden: row.numero_orden,
  createdAt: row.created_at,
  estado: row.estado,
  entrega: row.entrega,
  metodoPago: row.metodo_pago,
  direccionEntrega: row.direccion_entrega,
  subtotal: Number(row.subtotal),
  envio: Number(row.envio),
  total: Number(row.total),
  empresaId: row.empresa_id,
  sedeId: row.sede_id,
  empresaEnvio: row.empresa_envio ?? null,
  codigoSeguimiento: row.codigo_seguimiento ?? null,
  vendedor: row.vendedor,
  comprador: row.comprador,
  calificacion: row.calificacion ?? null,
  items: (row.items ?? []).map((item) => ({ ...item, precio: Number(item.precio) })),
  eventos: row.eventos ?? [],
});

/**
 * Próximo paso del pedido para el vendedor (mismo criterio que `transicion_valida` en la base).
 * Cancelar se ofrece aparte.
 */
export function siguienteEstado(pedido: Pick<Pedido, 'estado' | 'entrega'>): EstadoPedido | null {
  switch (pedido.estado) {
    case 'pendiente':
      return 'confirmado';
    case 'confirmado':
      return 'preparando';
    case 'preparando':
      return pedido.entrega === 'local' ? 'listo_para_retirar' : 'enviado';
    case 'listo_para_retirar':
    case 'enviado':
      return 'entregado';
    default:
      return null;
  }
}

export const sePuedeCancelar = (estado: EstadoPedido) =>
  estado === 'pendiente' || estado === 'confirmado' || estado === 'preparando';

export const pedidoActivo = (estado: EstadoPedido) => estado !== 'entregado' && estado !== 'cancelado';

export async function obtenerMisPedidos(): Promise<Pedido[]> {
  const { data, error } = await supabase.rpc('mis_compras_pedidos');

  if (error) {
    throw new Error(error.message);
  }

  return ((data ?? []) as PedidoJson[]).map(mapPedido);
}

/** Ventas del particular (sin empresa) o de la empresa indicada, según las sedes que el miembro ve. */
export async function obtenerVentas(empresaId: number | null): Promise<Pedido[]> {
  const { data, error } = await supabase.rpc('pedidos_venta', { p_empresa: empresaId });

  if (error) {
    throw new Error(error.message);
  }

  return ((data ?? []) as PedidoJson[]).map(mapPedido);
}

export async function cambiarEstadoPedido(pedidoId: number, estado: EstadoPedido, nota?: string) {
  const { error } = await supabase.rpc('cambiar_estado_pedido', {
    p_pedido: pedidoId,
    p_estado: estado,
    p_nota: nota?.trim() || null,
  });

  if (error) {
    throw new Error(error.message);
  }
}

/** Pasa el pedido a "enviado" guardando el correo o mensajería y el código de seguimiento. */
export async function marcarPedidoEnviado(pedidoId: number, empresaEnvio: string, codigo?: string) {
  const { error } = await supabase.rpc('marcar_pedido_enviado', {
    p_pedido: pedidoId,
    p_empresa_envio: empresaEnvio.trim(),
    p_codigo: codigo?.trim() || null,
  });

  if (error) {
    throw new Error(error.message);
  }
}

export interface MetricasVentas {
  desde: string;
  pedidos: number;
  ingresos: number;
  unidades: number;
  entregados: number;
  enCurso: number;
  cancelados: number;
  porDia: { dia: string; ingresos: number; pedidos: number }[];
  topProductos: { nombre: string; unidades: number; ingresos: number }[];
  porSede: { sede: string; pedidos: number; ingresos: number }[];
  stockBajo: { id: number; nombre: string; stock: number }[];
}

/** Métricas del particular (empresaId nulo) o de una empresa, de los últimos `dias` días. */
export async function obtenerMetricas(empresaId: number | null, dias: number): Promise<MetricasVentas> {
  const { data, error } = await supabase.rpc('metricas_ventas', { p_empresa: empresaId, p_dias: dias });

  if (error) {
    throw new Error(error.message);
  }

  const m = data as Record<string, unknown> & {
    por_dia: { dia: string; ingresos: number | string; pedidos: number | string }[] | null;
    top_productos: { nombre: string; unidades: number | string; ingresos: number | string }[] | null;
    por_sede: { sede: string; pedidos: number | string; ingresos: number | string }[] | null;
    stock_bajo: { id: number; nombre: string; stock: number }[] | null;
  };

  return {
    desde: String(m.desde),
    pedidos: Number(m.pedidos),
    ingresos: Number(m.ingresos),
    unidades: Number(m.unidades),
    entregados: Number(m.entregados),
    enCurso: Number(m.en_curso),
    cancelados: Number(m.cancelados),
    porDia: (m.por_dia ?? []).map((d) => ({ dia: d.dia, ingresos: Number(d.ingresos), pedidos: Number(d.pedidos) })),
    topProductos: (m.top_productos ?? []).map((t) => ({
      nombre: t.nombre,
      unidades: Number(t.unidades),
      ingresos: Number(t.ingresos),
    })),
    porSede: (m.por_sede ?? []).map((t) => ({ sede: t.sede, pedidos: Number(t.pedidos), ingresos: Number(t.ingresos) })),
    stockBajo: m.stock_bajo ?? [],
  };
}

export async function calificarPedido(pedidoId: number, puntaje: number, comentario?: string) {
  const { error } = await supabase.rpc('calificar_pedido', {
    p_pedido: pedidoId,
    p_puntaje: puntaje,
    p_comentario: comentario?.trim() || null,
  });

  if (error) {
    throw new Error(error.message);
  }
}

export async function responderCalificacion(calificacionId: number, respuesta: string) {
  const { error } = await supabase.rpc('responder_calificacion', {
    p_calificacion: calificacionId,
    p_respuesta: respuesta.trim(),
  });

  if (error) {
    throw new Error(error.message);
  }
}

export interface Reputacion {
  promedio: number | null;
  cantidad: number;
  ultimas: { puntaje: number; comentario: string | null; respuesta: string | null; fecha: string; autor: string | null }[];
}

/** Reputación de una empresa o de un particular. Si la migración 12 no está, devuelve "sin opiniones". */
export async function obtenerReputacion(destino: { empresaId?: number; vendedorId?: string }): Promise<Reputacion> {
  const { data, error } = await supabase.rpc('reputacion', {
    p_empresa: destino.empresaId ?? null,
    p_vendedor: destino.vendedorId ?? null,
  });

  if (error || !data) {
    return { promedio: null, cantidad: 0, ultimas: [] };
  }

  return {
    promedio: data.promedio === null ? null : Number(data.promedio),
    cantidad: Number(data.cantidad),
    ultimas: data.ultimas ?? [],
  };
}

export async function obtenerReputacionProducto(productoId: string): Promise<Pick<Reputacion, 'promedio' | 'cantidad'>> {
  const { data, error } = await supabase.rpc('reputacion_producto', { p_producto: Number(productoId) });

  if (error || !data) {
    return { promedio: null, cantidad: 0 };
  }

  return { promedio: data.promedio === null ? null : Number(data.promedio), cantidad: Number(data.cantidad) };
}
