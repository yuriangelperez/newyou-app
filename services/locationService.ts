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
    const respuesta = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&accept-language=es&lat=${latitude}&lon=${longitude}`,
    );
    const data = (await respuesta.json()) as NominatimResponse;
    const a = data.address;

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
      accuracy: Location.Accuracy.High,
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
