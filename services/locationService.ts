import * as Location from 'expo-location';
import { Linking, Platform } from 'react-native';

export type UbicacionResultado =
  | {
      ok: true;
      direccion: string;
      latitud: number;
      longitud: number;
      /** true si no se pudo obtener una dirección legible y sólo hay coordenadas. */
      soloCoordenadas: boolean;
      /** Margen de error informado por el dispositivo, en metros (null si no lo informa). */
      precisionMetros: number | null;
    }
  | { ok: false; motivo: string };

interface NominatimResponse {
  address?: {
    road?: string;
    pedestrian?: string;
    house_number?: string;
    city?: string;
    town?: string;
    village?: string;
    state?: string;
  };
}

// Nominatim rechaza los pedidos sin una app identificada (el User-Agent por defecto
// del celular, "okhttp", queda bloqueado): por eso fallaba la búsqueda en el .apk.
const CABECERAS_OSM = {
  'User-Agent': 'NewYouApp/1.0 (proyecto academico UNPilar)',
  Referer: 'https://yuriangelperez.github.io/newyou-app/',
  Accept: 'application/json',
};

/** GET a un servicio de mapas que devuelve JSON; null si responde con error. */
async function pedirJson<T>(url: string): Promise<T | null> {
  const respuesta = await fetch(url, { headers: Platform.OS === 'web' ? undefined : CABECERAS_OSM });
  if (!respuesta.ok) {
    return null;
  }
  return (await respuesta.json()) as T;
}

/** El geocoder del celular necesita el permiso de ubicación en Android; sin él ni se intenta. */
async function hayPermisoUbicacion() {
  try {
    return (await Location.getForegroundPermissionsAsync()).granted;
  } catch {
    return false;
  }
}

function formatearDireccion(partes: (string | null | undefined)[]) {
  return partes.filter(Boolean).join(', ');
}

/** Geocodificación inversa nativa (no disponible en web). */
async function direccionConExpo(latitude: number, longitude: number) {
  if (Platform.OS === 'web') {
    return '';
  }

  try {
    const [lugar] = await Location.reverseGeocodeAsync({ latitude, longitude });
    return formatearDireccion([
      [lugar?.street, lugar?.streetNumber].filter(Boolean).join(' '),
      lugar?.city ?? lugar?.subregion,
      lugar?.region,
    ]);
  } catch {
    return '';
  }
}

/** Alternativa gratuita (OpenStreetMap Nominatim) cuando la nativa no devuelve nada. */
async function direccionConNominatim(latitude: number, longitude: number) {
  try {
    const data = await pedirJson<NominatimResponse>(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&accept-language=es&lat=${latitude}&lon=${longitude}`,
    );
    const a = data?.address;

    return formatearDireccion([
      [a?.road ?? a?.pedestrian, a?.house_number].filter(Boolean).join(' '),
      a?.city ?? a?.town ?? a?.village,
      a?.state,
    ]);
  } catch {
    return '';
  }
}

/**
 * Obtiene la dirección actual por GPS. Nunca lanza: ante cualquier fallo
 * (permiso denegado, GPS apagado, sin señal) devuelve `ok: false` para que
 * la UI permita cargar la dirección manualmente.
 */
export async function obtenerDireccionActual(): Promise<UbicacionResultado> {
  try {
    const permiso = await Location.requestForegroundPermissionsAsync();
    if (!permiso.granted) {
      return { ok: false, motivo: 'Permiso de ubicación denegado.' };
    }

    const posicion = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });
    const { latitude, longitude, accuracy } = posicion.coords;

    const direccion =
      (await direccionConExpo(latitude, longitude)) ||
      (await direccionConNominatim(latitude, longitude));

    return {
      ok: true,
      direccion: direccion || `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`,
      latitud: latitude,
      longitud: longitude,
      soloCoordenadas: !direccion,
      precisionMetros: accuracy ?? null,
    };
  } catch {
    return { ok: false, motivo: 'No se pudo obtener la ubicación (¿sin señal GPS?).' };
  }
}

/**
 * Coordenadas de una dirección escrita, para mostrarla en el mapa de la app.
 * Primero prueba el geocoder del celular y si no encuentra nada usa Nominatim.
 */
export async function buscarCoordenadas(
  direccion: string,
): Promise<{ latitud: number; longitud: number } | null> {
  const consulta = direccion.trim();
  if (!consulta) {
    return null;
  }

  // 1) Geocoder del celular: sólo con permiso de ubicación (sin él, en Android falla).
  if (Platform.OS !== 'web' && (await hayPermisoUbicacion())) {
    try {
      const [lugar] = await Location.geocodeAsync(consulta);
      if (lugar) {
        return { latitud: lugar.latitude, longitud: lugar.longitude };
      }
    } catch {
      // Sigue con OpenStreetMap.
    }
  }

  // 2) Nominatim (OpenStreetMap). No necesita permiso ni clave.
  try {
    const lugares = await pedirJson<{ lat: string; lon: string }[]>(
      `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&accept-language=es&countrycodes=ar&q=${encodeURIComponent(consulta)}`,
    );
    const lugar = lugares?.[0];
    if (lugar) {
      return { latitud: Number(lugar.lat), longitud: Number(lugar.lon) };
    }
  } catch {
    // Sigue con Photon.
  }

  // 3) Photon (también usa datos de OpenStreetMap), por si Nominatim no responde.
  try {
    const data = await pedirJson<{ features?: { geometry?: { coordinates?: [number, number] } }[] }>(
      `https://photon.komoot.io/api/?limit=1&lang=es&q=${encodeURIComponent(`${consulta}, Argentina`)}`,
    );
    const coordenadas = data?.features?.[0]?.geometry?.coordinates;
    return coordenadas ? { latitud: coordenadas[1], longitud: coordenadas[0] } : null;
  } catch {
    return null;
  }
}

/**
 * Abre Google Maps buscando la dirección escrita, para que el usuario verifique
 * que está bien. En web abre una pestaña nueva; en el celular, la app de mapas.
 */
export function abrirDireccionEnMapa(direccion: string) {
  const consulta = direccion.trim();

  if (!consulta) {
    return Promise.resolve();
  }

  const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(consulta)}`;

  if (Platform.OS === 'web') {
    window.open(url, '_blank', 'noopener,noreferrer');
    return Promise.resolve();
  }

  return Linking.openURL(url);
}
