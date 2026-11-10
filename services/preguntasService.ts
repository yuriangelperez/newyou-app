import { errorTraducido } from './erroresSupabase';
import { supabase } from './supabase';

export interface Pregunta {
  id: number;
  productoId: number;
  autorId: string;
  texto: string;
  respuesta: string | null;
  respondidaAt: string | null;
  oculta: boolean;
  createdAt: string;
}

interface PreguntaRow {
  id: number;
  producto_id: number;
  autor_id: string;
  texto: string;
  respuesta: string | null;
  respondida_at: string | null;
  oculta: boolean;
  created_at: string;
}

const COLUMNAS = 'id, producto_id, autor_id, texto, respuesta, respondida_at, oculta, created_at';

export const mapPregunta = (row: PreguntaRow): Pregunta => ({
  id: row.id,
  productoId: row.producto_id,
  autorId: row.autor_id,
  texto: row.texto,
  respuesta: row.respuesta,
  respondidaAt: row.respondida_at,
  oculta: row.oculta,
  createdAt: row.created_at,
});

/** Preguntas de una prenda, la más nueva primero (RLS decide cuáles ocultas se ven). */
export async function listarPreguntas(productoId: string | number) {
  const { data, error } = await supabase
    .from('preguntas')
    .select(COLUMNAS)
    .eq('producto_id', Number(productoId))
    .order('created_at', { ascending: false })
    .limit(100);

  if (error) {
    throw errorTraducido(error);
  }
  return (data as PreguntaRow[]).map(mapPregunta);
}

async function llamar(funcion: string, parametros: Record<string, unknown>) {
  const { data, error } = await supabase.rpc(funcion, parametros);
  if (error) {
    throw errorTraducido(error);
  }
  return data;
}

export async function hacerPregunta(productoId: string | number, texto: string) {
  const data = await llamar('hacer_pregunta', { p_producto: Number(productoId), p_texto: texto.trim() });
  return mapPregunta(data as PreguntaRow);
}

export async function responderPregunta(preguntaId: number, respuesta: string) {
  const data = await llamar('responder_pregunta', { p_pregunta: preguntaId, p_respuesta: respuesta.trim() });
  return mapPregunta(data as PreguntaRow);
}

export async function ocultarPregunta(preguntaId: number, oculta = true) {
  await llamar('ocultar_pregunta', { p_pregunta: preguntaId, p_oculta: oculta });
}

/** Preguntas sin responder por prenda, de lo que puedo responder: { productoId: cantidad }. */
export async function misPreguntasPendientes(): Promise<Record<string, number>> {
  const data = (await llamar('mis_preguntas_pendientes', {})) as { producto_id: number; cantidad: number }[];
  return Object.fromEntries((data ?? []).map((fila) => [String(fila.producto_id), Number(fila.cantidad)]));
}
