import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

import { secureSessionStorage } from '../services/secureSessionStorage';

jest.mock('expo-secure-store', () => {
  const almacen = new Map<string, string>();
  return {
    __almacen: almacen,
    setItemAsync: jest.fn(async (clave: string, valor: string) => {
      if (valor.length > 2048) {
        throw new Error('Value too large');
      }
      almacen.set(clave, valor);
    }),
    getItemAsync: jest.fn(async (clave: string) => almacen.get(clave) ?? null),
    deleteItemAsync: jest.fn(async (clave: string) => {
      almacen.delete(clave);
    }),
  };
});

const CLAVE = 'sb-proyecto-auth-token';

beforeEach(async () => {
  (SecureStore as unknown as { __almacen: Map<string, string> }).__almacen.clear();
  await AsyncStorage.clear();
});

describe('secureSessionStorage', () => {
  it('guarda una sesión de más de 2048 bytes partiéndola en trozos', async () => {
    const sesion = JSON.stringify({ access_token: 'a'.repeat(3000), refresh_token: 'r'.repeat(500) });

    await secureSessionStorage.setItem(CLAVE, sesion);

    await expect(secureSessionStorage.getItem(CLAVE)).resolves.toBe(sesion);
    expect(await SecureStore.getItemAsync(`${CLAVE}.partes`)).toBe('2');
  });

  it('no deja el JWT en AsyncStorage', async () => {
    await secureSessionStorage.setItem(CLAVE, 'jwt');

    await expect(AsyncStorage.getItem(CLAVE)).resolves.toBeNull();
  });

  it('borra todas las partes al cerrar sesión', async () => {
    await secureSessionStorage.setItem(CLAVE, 'x'.repeat(4000));
    await secureSessionStorage.removeItem(CLAVE);

    await expect(secureSessionStorage.getItem(CLAVE)).resolves.toBeNull();
    expect(await SecureStore.getItemAsync(`${CLAVE}.0`)).toBeNull();
  });

  it('mueve a SecureStore una sesión vieja guardada en AsyncStorage', async () => {
    await AsyncStorage.setItem(CLAVE, 'sesion-vieja');

    await expect(secureSessionStorage.getItem(CLAVE)).resolves.toBe('sesion-vieja');
    await expect(AsyncStorage.getItem(CLAVE)).resolves.toBeNull();
    expect(await SecureStore.getItemAsync(`${CLAVE}.0`)).toBe('sesion-vieja');
  });
});
