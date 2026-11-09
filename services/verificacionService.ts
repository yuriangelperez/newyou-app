import { EstadoVerificacion } from '../types';
import { errorTraducido } from './erroresSupabase';
import { pickImageFromCamera, uploadProductImage } from './storageService';
import { supabase } from './supabase';

export type DecisionVerificacion = 'aprobada' | 'rechazada' | 'requiere_cambios';

export interface VerificacionAdmin {
  productoId: number;
  nombre: string;
  descripcion: string;
  imagenes: string[];
  estado: EstadoVerificacion;
  codigo: string | null;
  fotoCodigo: string | null;
  venceAt: string | null;
  vencida: boolean;
  motivo: string | null;
  vendedor: string | null;
}

interface FilaAdmin {
  producto_id: number;
  nombre: string;
  descripcion: string | null;
  imagenes: string[] | null;
  imagen_url: string | null;
  estado: EstadoVerificacion;
  codigo: string | null;
  foto_codigo: string | null;
  vence_at: string | null;
  vencida: boolean | null;
  motivo: string | null;
  vendedor: string | null;
}

export const mapVerificacion = (fila: FilaAdmin): VerificacionAdmin => ({
  productoId: fila.producto_id,
  nombre: fila.nombre,
  descripcion: fila.descripcion ?? '',
  imagenes: (fila.imagenes?.length ? fila.imagenes : [fila.imagen_url]).filter((url): url is string => Boolean(url)),
  estado: fila.estado,
  codigo: fila.codigo,
  fotoCodigo: fila.foto_codigo,
  venceAt: fila.vence_at,
  vencida: Boolean(fila.vencida),
  motivo: fila.motivo,
  vendedor: fila.vendedor,
});

/** Texto del plazo: "vence en 5 h", "venció hace 2 días". */
export function textoPlazo(venceAt: string | null, ahora = new Date()) {
  if (!venceAt) {
    return 'Sin plazo';
  }
  const diferencia = new Date(venceAt).getTime() - ahora.getTime();
  const horas = Math.round(Math.abs(diferencia) / 3_600_000);
  const cantidad = horas >= 48 ? `${Math.round(horas / 24)} días` : `${Math.max(horas, 1)} h`;
  return diferencia >= 0 ? `Vence en ${cantidad}` : `Venció hace ${cantidad}`;
}

export async function listarVerificaciones(estado: EstadoVerificacion | null = 'pendiente') {
  const { data, error } = await supabase.rpc('admin_verificaciones', { p_estado: estado });
  if (error) {
    throw errorTraducido(error);
  }
  return ((data ?? []) as FilaAdmin[]).map(mapVerificacion);
}

export async function resolverVerificacion(productoId: number, estado: DecisionVerificacion, motivo?: string) {
  const { error } = await supabase.rpc('resolver_verificacion', {
    p_producto: productoId,
    p_estado: estado,
    p_motivo: motivo?.trim() || null,
  });
  if (error) {
    throw errorTraducido(error);
  }
}

/**
 * El vendedor saca una foto de la prenda con el código escrito a mano y la sube.
 * Sólo cámara (no galería) para que sea una foto actual. Devuelve false si canceló.
 */
export async function subirFotoVerificacion(productoId: string | number) {
  const foto = await pickImageFromCamera();
  if (!foto) {
    return false;
  }
  const url = await uploadProductImage(foto);
  const { error } = await supabase.rpc('cargar_foto_verificacion', { p_producto: Number(productoId), p_url: url });
  if (error) {
    throw errorTraducido(error);
  }
  return true;
}
