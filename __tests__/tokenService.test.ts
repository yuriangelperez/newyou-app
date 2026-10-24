import * as SecureStore from 'expo-secure-store';

import { tokenService } from '../services/tokenService';

jest.mock('expo-secure-store', () => {
  const almacen = new Map<string, string>();
  return {
    setItemAsync: jest.fn(async (clave: string, valor: string) => {
      almacen.set(clave, valor);
    }),
    getItemAsync: jest.fn(async (clave: string) => almacen.get(clave) ?? null),
    deleteItemAsync: jest.fn(async (clave: string) => {
      almacen.delete(clave);
    }),
  };
});

describe('tokenService', () => {
  it('guarda el token y el usuario en SecureStore', async () => {
    await tokenService.save('jwt-de-prueba', 'usuario-1');

    expect(SecureStore.setItemAsync).toHaveBeenCalledWith('session_token', 'jwt-de-prueba');
    await expect(tokenService.get()).resolves.toBe('jwt-de-prueba');
    await expect(tokenService.getUserId()).resolves.toBe('usuario-1');
  });

  it('borra el token al cerrar sesión', async () => {
    await tokenService.save('jwt-de-prueba', 'usuario-1');
    await tokenService.clear();

    await expect(tokenService.get()).resolves.toBeNull();
    await expect(tokenService.getUserId()).resolves.toBeNull();
  });
});
