import { errorTraducido } from './erroresSupabase';
import { supabase } from './supabase';

export interface Punto {
  lat: number;
  lng: number;
  /** De dónde salió: el GPS o la dirección principal guardada. */
  origen: 'gps' | 'direccion';
}

/**
 * Punto desde donde medir: primero el GPS (pide permiso); si no hay, la dirección
 * principal del usuario si ya tiene coordenadas. null si no hay ninguno.
 */
export async function obtenerMiPunto(): Promise<Punto | null> {
  try {
    const { obtenerDireccionActual } = await import('./locationService');
    const actual = await obtenerDireccionActual();
    if (actual.ok) {
      return { lat: actual.latitud, lng: actual.longitud, origen: 'gps' };
    }
  } catch {
    // Sigue con la dirección guardada.
  }

  const { data } = await supabase
    .from('direcciones')
    .select('lat, lng')
    .eq('es_principal', true)
    .not('lat', 'is', null)
    .maybeSingle();
  return data?.lat != null && data?.lng != null ? { lat: data.lat, lng: data.lng, origen: 'direccion' } : null;
}

/** Prendas a menos de `radioKm` del punto: { productoId: distancia en km }. */
export async function productosCercanos(punto: Pick<Punto, 'lat' | 'lng'>, radioKm: number) {
  const { data, error } = await supabase.rpc('productos_cercanos', {
    p_lat: punto.lat,
    p_lng: punto.lng,
    p_radio_km: radioKm,
  });
  if (error) {
    throw errorTraducido(error);
  }
  return Object.fromEntries(
    ((data ?? []) as { producto_id: number; distancia_km: number }[]).map((fila) => [
      String(fila.producto_id),
      Number(fila.distancia_km),
    ]),
  ) as Record<string, number>;
}
