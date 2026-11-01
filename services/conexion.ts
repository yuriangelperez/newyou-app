import NetInfo from '@react-native-community/netinfo';
import { Platform } from 'react-native';

// En la web NetInfo comprueba si hay Internet con un HEAD a "/" y sólo acepta un 200.
// En GitHub Pages la app vive en /newyou-app/, así que "/" (la raíz de github.io) responde
// 404 y la app creía que no había conexión. Cualquier respuesta HTTP ya prueba que hay red;
// si no hay red, el fetch falla y NetInfo marca la falta de conexión igual.
if (Platform.OS === 'web') {
  NetInfo.configure({
    reachabilityTest: () => Promise.resolve(true),
  });
}

/** true si el dispositivo está conectado y (si se sabe) llega a Internet. */
export async function hayConexion() {
  const estado = await NetInfo.fetch();
  return Boolean(estado.isConnected) && estado.isInternetReachable !== false;
}
