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

// El permiso para buscar con Google se pide una sola vez por sesión (si lo niega, no se insiste).
let permisoYaPedido = false;

/**
 * Pide el permiso de ubicación para poder buscar la dirección con el geocodificador
 * del celular (en Android es el de Google: gratis y sin clave). No usa el GPS.
 */
async function pedirPermisoParaBuscar() {
  if (await hayPermisoUbicacion()) return true;
  if (permisoYaPedido) return false;
  permisoYaPedido = true;
  try {
    return (await Location.requestForegroundPermissionsAsync()).granted;
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
// Puntos ya conocidos (elegidos con el pin o de una sugerencia): no se vuelven a buscar,
// así el mapa no salta a otro lugar después de que el usuario lo marcó.
const puntosConocidos = new Map<string, { latitud: number; longitud: number }>();

export function recordarPunto(direccion: string, punto: { latitud: number; longitud: number }) {
  puntosConocidos.set(direccion.trim().toLowerCase(), { latitud: punto.latitud, longitud: punto.longitud });
}

export async function buscarCoordenadas(
  direccion: string,
): Promise<{ latitud: number; longitud: number; aproximada?: boolean } | null> {
  const consulta = direccion.trim();
  if (!consulta) {
    return null;
  }

  const conocido = puntosConocidos.get(consulta.toLowerCase());
  if (conocido) {
    return conocido;
  }

  // 1) Geocodificador del celular (Google en Android): necesita el permiso de ubicación,
  //    así que se pide la primera vez. OpenStreetMap sólo dibuja el mapa con esas coordenadas.
  if (Platform.OS !== 'web' && (await pedirPermisoParaBuscar())) {
    try {
      const [lugar] = await Location.geocodeAsync(consulta);
      if (lugar) {
        return { latitud: lugar.latitude, longitud: lugar.longitude };
      }
    } catch {
      // Sigue con OpenStreetMap.
    }
  }

  // 2) OpenStreetMap con la dirección completa.
  const exacta = await buscarEnOsm(consulta);
  if (exacta) {
    return exacta;
  }

  // 3) En muchas calles del conurbano OSM no tiene cargadas las alturas
  //    (p. ej. "Adolfo Alsina 3048, Manuel Alberti"): se busca la calle sin el
  //    número y se avisa que el punto es aproximado.
  const sinAltura = quitarAltura(consulta);
  if (sinAltura && sinAltura !== consulta) {
    const calle = await buscarEnOsm(sinAltura);
    if (calle) {
      return { ...calle, aproximada: true };
    }
  }

  return null;
}

/** "Adolfo Alsina 3048, Manuel Alberti" → "Adolfo Alsina, Manuel Alberti". */
export function quitarAltura(direccion: string) {
  // Sólo se toca la primera parte (calle y altura); la localidad queda igual.
  // Se usa recién cuando la dirección completa no aparece en el mapa.
  const [calle, ...resto] = direccion.split(',');
  const sinNumero = calle.replace(/\s+(n[°º]\.?\s*)?\d+\s*[a-z]?$/i, '').trim();
  return [sinNumero, ...resto.map((parte) => parte.trim())].filter(Boolean).join(', ');
}

// Photon sólo acepta lang=default/en/de/fr: se limita a Argentina con un recuadro.
const BBOX_ARGENTINA = '-73.6,-55.1,-53.6,-21.8';
// Las sugerencias priorizan lo más cercano a Pilar (zona de la app).
const CERCA_DE = { lat: -34.4587, lon: -58.9142 };

interface PhotonFeature {
  geometry?: { coordinates?: [number, number] };
  properties?: {
    name?: string;
    street?: string;
    housenumber?: string;
    city?: string;
    locality?: string;
    district?: string;
    county?: string;
    state?: string;
  };
}

export interface SugerenciaDireccion {
  texto: string;
  latitud: number;
  longitud: number;
}

/**
 * Autocompletado de direcciones mientras se escribe (Photon, de OpenStreetMap:
 * gratis, sin clave y pensado para buscar letra por letra; Nominatim no lo permite).
 */
export async function sugerirDirecciones(texto: string): Promise<SugerenciaDireccion[]> {
  const consulta = texto.trim();
  if (consulta.length < 4) {
    return [];
  }
  try {
    const data = await pedirJson<{ features?: PhotonFeature[] }>(
      `https://photon.komoot.io/api/?limit=5&bbox=${BBOX_ARGENTINA}&lat=${CERCA_DE.lat}&lon=${CERCA_DE.lon}&location_bias_scale=0.5&q=${encodeURIComponent(consulta)}`,
    );
    const vistas = new Set<string>();
    const sugerencias: SugerenciaDireccion[] = [];
    for (const lugar of data?.features ?? []) {
      const p = lugar.properties ?? {};
      const coordenadas = lugar.geometry?.coordinates;
      const calle = p.street ? [p.street, p.housenumber].filter(Boolean).join(' ') : p.name;
      const localidad = p.city ?? p.locality ?? p.district ?? p.county;
      const textoSugerido = formatearDireccion([calle, localidad, p.state]);
      if (!coordenadas || !textoSugerido || vistas.has(textoSugerido)) continue;
      vistas.add(textoSugerido);
      sugerencias.push({ texto: textoSugerido, latitud: coordenadas[1], longitud: coordenadas[0] });
    }
    return sugerencias;
  } catch {
    return [];
  }
}

/** Dirección legible de un punto del mapa (para el pin que mueve el usuario). */
export async function direccionDeCoordenadas(latitud: number, longitud: number) {
  const nativa = (await hayPermisoUbicacion()) ? await direccionConExpo(latitud, longitud) : '';
  return nativa || (await direccionConNominatim(latitud, longitud));
}

/**
 * Búsqueda en Nominatim (OpenStreetMap). Photon no se usa acá: con direcciones
 * del conurbano devolvía la calle homónima de otra ciudad y el pin quedaba lejos.
 */
async function buscarEnOsm(consulta: string): Promise<{ latitud: number; longitud: number } | null> {
  try {
    const lugares = await pedirJson<{ lat: string; lon: string }[]>(
      `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&accept-language=es&countrycodes=ar&q=${encodeURIComponent(consulta)}`,
    );
    const lugar = lugares?.[0];
    return lugar ? { latitud: Number(lugar.lat), longitud: Number(lugar.lon) } : null;
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
