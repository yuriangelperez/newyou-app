import NetInfo from '@react-native-community/netinfo';

/** true si el dispositivo está conectado y (si se sabe) llega a Internet. */
export async function hayConexion() {
  const estado = await NetInfo.fetch();
  return Boolean(estado.isConnected) && estado.isInternetReachable !== false;
}
