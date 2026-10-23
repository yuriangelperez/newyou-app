import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const TOKEN_KEY = 'session_token';
const USER_ID_KEY = 'session_user_id';

// SecureStore cifra con Keychain (iOS) / Keystore (Android). No existe en la web.
const disponible = Platform.OS !== 'web';

/** Token JWT de la sesión guardado de forma segura (no en AsyncStorage). */
export const tokenService = {
  /** Guarda el token al iniciar sesión o cuando Supabase lo renueva. */
  save: async (token: string, userId: string) => {
    if (!disponible) return;
    await SecureStore.setItemAsync(TOKEN_KEY, token);
    await SecureStore.setItemAsync(USER_ID_KEY, userId);
  },

  get: async () => (disponible ? SecureStore.getItemAsync(TOKEN_KEY) : null),

  getUserId: async () => (disponible ? SecureStore.getItemAsync(USER_ID_KEY) : null),

  /** Borra el token al cerrar sesión. */
  clear: async () => {
    if (!disponible) return;
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    await SecureStore.deleteItemAsync(USER_ID_KEY);
  },
};
