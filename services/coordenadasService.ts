/**
 * Coordenadas de una dirección para guardarlas junto a ella (filtro por cercanía).
 * Nunca lanza: si no se encuentra o no hay red, se guarda sin coordenadas.
 * locationService se importa al usarlo para no cargar expo-location en los tests.
 */
export async function coordenadasDe(direccion: string | null | undefined) {
  const texto = direccion?.trim();
  if (!texto) {
    return null;
  }
  try {
    const { buscarCoordenadas } = await import('./locationService');
    const punto = await buscarCoordenadas(texto);
    return punto ? { lat: punto.latitud, lng: punto.longitud } : null;
  } catch {
    return null;
  }
}
