import { ROUTES } from '../constants/routes';
import { errorTraducido } from './erroresSupabase';
import { supabase } from './supabase';

/**
 * Panel de notificaciones dentro de la app (migración 28): todo lo que se avisa por push
 * queda guardado en `notificaciones`. (Los push en sí están en notificacionesService/pushService.)
 */
export interface DatosAviso {
  tipo?: string;
  pedidoId?: number | string;
  productoId?: number | string;
  /** Lo que se compró, p. ej. "1 × Remera, 2 × Jean" (lo completa la base). */
  detalle?: string;
  producto?: string;
  imagen?: string;
  pregunta?: string;
  respuesta?: string;
}

export interface Aviso {
  id: number;
  titulo: string;
  cuerpo: string;
  datos: DatosAviso;
  leida: boolean;
  createdAt: string;
}

type AvisoRow = {
  id: number;
  titulo: string;
  cuerpo: string;
  datos: DatosAviso | null;
  leida: boolean;
  created_at: string;
};

const mapAviso = (row: AvisoRow): Aviso => ({
  id: Number(row.id),
  titulo: row.titulo,
  cuerpo: row.cuerpo,
  datos: row.datos ?? {},
  leida: row.leida,
  createdAt: row.created_at,
});

export async function listarAvisos(limite = 60): Promise<Aviso[]> {
  const { data, error } = await supabase
    .from('notificaciones')
    .select('id, titulo, cuerpo, datos, leida, created_at')
    .order('created_at', { ascending: false })
    .limit(limite);
  if (error) {
    throw errorTraducido(error);
  }
  return ((data ?? []) as AvisoRow[]).map(mapAviso);
}

export async function contarAvisosSinLeer(): Promise<number> {
  const { count, error } = await supabase
    .from('notificaciones')
    .select('id', { count: 'exact', head: true })
    .eq('leida', false);
  if (error) {
    throw errorTraducido(error);
  }
  return count ?? 0;
}

/** Marca leídas las indicadas, o todas si no se pasan ids. */
export async function marcarAvisosLeidos(ids?: number[]) {
  const { error } = await supabase.rpc('marcar_notificaciones_leidas', { p_ids: ids ?? null });
  if (error) {
    throw errorTraducido(error);
  }
}

let suscripciones = 0;

/**
 * Avisa cuando llega o cambia una notificación del usuario. Devuelve la función para dejar de escuchar.
 * Cada suscripción usa su propio canal: la campanita y el panel escuchan a la vez, y supabase.channel()
 * con el mismo nombre devolvería el canal ya suscripto (y falla al agregarle otro callback).
 */
export function escucharAvisos(usuarioId: string, alCambiar: () => void) {
  suscripciones += 1;
  const canal = supabase
    .channel(`avisos-${usuarioId}-${suscripciones}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'notificaciones', filter: `usuario_id=eq.${usuarioId}` },
      () => alCambiar(),
    )
    .subscribe();
  return () => {
    void supabase.removeChannel(canal);
  };
}

type Destino = string | { pathname: string; params: Record<string, string> };

/** Pantalla que abre una notificación (la misma para el push y para el panel). */
export function destinoAviso(datos: DatosAviso): Destino | null {
  if (datos.tipo === 'chat' && datos.pedidoId) {
    return { pathname: ROUTES.orderChat, params: { id: String(datos.pedidoId) } };
  }
  if (datos.tipo === 'venta') return ROUTES.mySales;
  if (datos.tipo === 'compra') return ROUTES.myPurchases;
  if (datos.tipo === 'liquidacion') return ROUTES.myPayouts;
  if (datos.tipo === 'verificacion') return ROUTES.myProducts;
  if (datos.productoId) {
    return { pathname: ROUTES.productDetail, params: { id: String(datos.productoId) } };
  }
  return null;
}

/** Línea de contexto bajo el título: la pregunta y la prenda, o lo que se compró. */
export function contextoAviso(aviso: Aviso): string | null {
  const { datos } = aviso;
  if (datos.tipo === 'pregunta' && datos.pregunta) {
    return `"${datos.pregunta}"`;
  }
  if (datos.tipo === 'respuesta' && datos.respuesta) {
    return `${datos.pregunta ? `Preguntaste: "${datos.pregunta}"\n` : ''}Respuesta: "${datos.respuesta}"`;
  }
  if (datos.pedidoId) {
    return `Pedido #${datos.pedidoId}${datos.detalle ? ` · ${datos.detalle}` : ''}`;
  }
  if (datos.producto) {
    return datos.producto;
  }
  return null;
}
