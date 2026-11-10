import { errorTraducido } from './erroresSupabase';
import { supabase } from './supabase';

export interface MensajePedido {
  id: number;
  pedidoId: number;
  autorId: string | null;
  texto: string;
  sistema: boolean;
  createdAt: string;
}

interface MensajeRow {
  id: number;
  pedido_id: number;
  autor_id: string | null;
  texto: string;
  sistema: boolean;
  created_at: string;
}

export const mapMensaje = (row: MensajeRow): MensajePedido => ({
  id: row.id,
  pedidoId: row.pedido_id,
  autorId: row.autor_id,
  texto: row.texto,
  sistema: row.sistema,
  createdAt: row.created_at,
});

/** Agrega un mensaje sin duplicarlo (llega por la respuesta del envío y por Realtime). */
export function agregarMensaje(lista: MensajePedido[], nuevo: MensajePedido) {
  if (lista.some((mensaje) => mensaje.id === nuevo.id)) {
    return lista;
  }
  return [...lista, nuevo].sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id - b.id);
}

export async function listarMensajes(pedidoId: number) {
  const { data, error } = await supabase
    .from('mensajes_pedido')
    .select('id, pedido_id, autor_id, texto, sistema, created_at')
    .eq('pedido_id', pedidoId)
    .order('created_at', { ascending: true })
    .limit(500);

  if (error) {
    throw errorTraducido(error);
  }
  return (data as MensajeRow[]).map(mapMensaje);
}

export async function enviarMensaje(pedidoId: number, texto: string) {
  const { data, error } = await supabase.rpc('enviar_mensaje', { p_pedido: pedidoId, p_texto: texto.trim() });
  if (error) {
    throw errorTraducido(error);
  }
  return mapMensaje(data as MensajeRow);
}

export async function chatAbierto(pedidoId: number) {
  const { data, error } = await supabase.rpc('chat_abierto', { p_pedido: pedidoId });
  if (error) {
    throw errorTraducido(error);
  }
  return Boolean(data);
}

export async function marcarChatLeido(pedidoId: number) {
  await supabase.rpc('marcar_chat_leido', { p_pedido: pedidoId });
}

/** Mensajes sin leer por pedido: { pedidoId: cantidad }. */
export async function chatsSinLeer(): Promise<Record<number, number>> {
  const { data, error } = await supabase.rpc('mis_chats_sin_leer');
  if (error) {
    throw errorTraducido(error);
  }
  return Object.fromEntries(
    ((data ?? []) as { pedido_id: number; cantidad: number }[]).map((fila) => [fila.pedido_id, Number(fila.cantidad)]),
  );
}

/** Escucha los mensajes nuevos del pedido en tiempo real. Devuelve la función para dejar de escuchar. */
let suscripcionesChat = 0;

export function escucharMensajes(pedidoId: number, alRecibir: (mensaje: MensajePedido) => void) {
  // Canal propio por suscripción (mismo motivo que escucharAvisos).
  suscripcionesChat += 1;
  const canal = supabase
    .channel(`chat-pedido-${pedidoId}-${suscripcionesChat}`)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'mensajes_pedido', filter: `pedido_id=eq.${pedidoId}` },
      (payload) => alRecibir(mapMensaje(payload.new as MensajeRow)),
    )
    .subscribe();

  return () => {
    void supabase.removeChannel(canal);
  };
}
