import { Platform, Share } from 'react-native';
import Toast from 'react-native-toast-message';

// Web publicada en GitHub Pages: los links abren la prenda o la tienda en el navegador
// (404.html redirige la ruta). Se puede cambiar con EXPO_PUBLIC_URL_WEB.
export const URL_WEB = (process.env.EXPO_PUBLIC_URL_WEB || 'https://yuriangelperez.github.io/newyou-app').replace(/\/$/, '');

export function enlaceProducto(id: string) {
  return `${URL_WEB}/producto/${encodeURIComponent(id)}`;
}

export function enlaceTienda(slug: string) {
  return `${URL_WEB}/tienda/${encodeURIComponent(slug)}`;
}

/**
 * Abre el menú de compartir del celular. En el navegador usa navigator.share si existe;
 * si no, copia el texto al portapapeles.
 */
export async function compartir(mensaje: string) {
  try {
    if (Platform.OS !== 'web') {
      await Share.share({ message: mensaje });
    } else if (typeof navigator !== 'undefined' && navigator.share) {
      await navigator.share({ text: mensaje });
    } else {
      await navigator.clipboard.writeText(mensaje);
      Toast.show({ type: 'success', text1: 'Link copiado' });
    }
  } catch {
    // El usuario canceló o el navegador no dio permiso: no hace falta avisar.
  }
}
