import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

// SecureStore admite hasta 2048 bytes por valor y la sesión de Supabase
// (access + refresh token + datos del usuario) suele pasarlos: se guarda en partes.
const TAMANIO_PARTE = 1800;

// Las claves de SecureStore sólo aceptan letras, números, ".", "-" y "_".
const claveSegura = (clave: string) => clave.replace(/[^A-Za-z0-9._-]/g, '_');
const claveCantidad = (clave: string) => `${claveSegura(clave)}.partes`;
const clavePartes = (clave: string, i: number) => `${claveSegura(clave)}.${i}`;

async function borrarPartes(clave: string) {
  const cantidad = Number((await SecureStore.getItemAsync(claveCantidad(clave))) ?? 0);
  for (let i = 0; i < cantidad; i++) {
    await SecureStore.deleteItemAsync(clavePartes(clave, i));
  }
  await SecureStore.deleteItemAsync(claveCantidad(clave));
}

const almacenNativo = {
  async getItem(clave: string) {
    const cantidad = await SecureStore.getItemAsync(claveCantidad(clave));

    if (cantidad === null) {
      // Sesión guardada por versiones anteriores en AsyncStorage (texto plano):
      // se mueve a SecureStore y se borra de AsyncStorage.
      const anterior = await AsyncStorage.getItem(clave);
      if (anterior !== null) {
        await almacenNativo.setItem(clave, anterior);
        await AsyncStorage.removeItem(clave);
      }
      return anterior;
    }

    const partes: string[] = [];
    for (let i = 0; i < Number(cantidad); i++) {
      const parte = await SecureStore.getItemAsync(clavePartes(clave, i));
      if (parte === null) {
        return null;
      }
      partes.push(parte);
    }
    return partes.join('');
  },

  async setItem(clave: string, valor: string) {
    await borrarPartes(clave);
    const cantidad = Math.max(1, Math.ceil(valor.length / TAMANIO_PARTE));
    for (let i = 0; i < cantidad; i++) {
      await SecureStore.setItemAsync(
        clavePartes(clave, i),
        valor.slice(i * TAMANIO_PARTE, (i + 1) * TAMANIO_PARTE),
      );
    }
    await SecureStore.setItemAsync(claveCantidad(clave), String(cantidad));
  },

  async removeItem(clave: string) {
    await borrarPartes(clave);
  },
};

/**
 * Almacenamiento de la sesión de Supabase (JWT): cifrado con Keychain (iOS) /
 * Keystore (Android) vía SecureStore. En la web no hay SecureStore y se usa
 * AsyncStorage (localStorage del navegador).
 */
export const secureSessionStorage = Platform.OS === 'web' ? AsyncStorage : almacenNativo;
