import { Platform, useWindowDimensions } from 'react-native';

/** Ancho a partir del cual la versión web usa diseño de escritorio (barra superior, columnas). */
export const ANCHO_ESCRITORIO = 900;

/** true en la web con pantalla ancha: ahí la navegación pasa arriba y el contenido usa más ancho. */
export function useEsEscritorio() {
  const { width } = useWindowDimensions();
  return Platform.OS === 'web' && width >= ANCHO_ESCRITORIO;
}
