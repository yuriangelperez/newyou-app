import axios from 'axios';

import { supabase } from './supabase';
import { tokenService } from './tokenService';

/**
 * Cliente HTTP para APIs REST propias o de terceros (Clase 12). Supabase tiene su
 * propio cliente; esta instancia es para todo lo demás.
 */
export const api = axios.create({
  baseURL: process.env.EXPO_PUBLIC_API_URL || 'https://dummyjson.com',
  timeout: 10_000, // corta el pedido si el servidor no responde en 10 s
});

// Request: adjunta el JWT guardado en SecureStore (Clase 7) a cada pedido.
api.interceptors.request.use(async (config) => {
  const token = await tokenService.get();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response: un 401 significa token vencido o inválido → se cierra la sesión y la
// guardia de rutas de `app/_layout.tsx` lleva al login.
api.interceptors.response.use(
  (respuesta) => respuesta,
  async (error) => {
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      await tokenService.clear();
      await supabase.auth.signOut({ scope: 'local' }).catch(() => undefined);
    }
    return Promise.reject(error);
  },
);
