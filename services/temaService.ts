import { reloadAppAsync } from 'expo';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

import { CLAVE_TEMA, Tema } from '../constants/theme';

/**
 * Guarda el tema elegido en Ajustes y recarga la app para que todas las pantallas
 * vuelvan a armar sus estilos con la paleta nueva (constants/theme.ts la lee al abrir).
 */
export async function cambiarTema(tema: Tema) {
  if (Platform.OS === 'web') {
    globalThis.localStorage?.setItem(CLAVE_TEMA, tema);
    globalThis.location?.reload();
    return;
  }

  await SecureStore.setItemAsync(CLAVE_TEMA, tema);
  await reloadAppAsync('Cambio de tema');
}
