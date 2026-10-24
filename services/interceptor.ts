import type { SupabaseClient } from '@supabase/supabase-js';

type ClienteAuth = Pick<SupabaseClient['auth'], 'refreshSession' | 'signOut'>;

const esPedidoDeAuth = (url: string) => url.includes('/auth/v1/');

function conToken(init: RequestInit | undefined, token: string): RequestInit {
  const headers = new Headers(init?.headers);
  headers.set('Authorization', `Bearer ${token}`);
  return { ...init, headers };
}

/**
 * Interceptor de pedidos a Supabase (Clase 8). Supabase ya agrega el JWT a cada
 * pedido; si igual vuelve un 401 (token vencido o revocado), renueva la sesión
 * una sola vez y reintenta. Si no puede renovarla, cierra la sesión y la guardia
 * de rutas de `app/_layout.tsx` lleva al login.
 */
export function crearFetchConSesion(
  obtenerAuth: () => ClienteAuth,
  fetchBase: typeof fetch = (...args) => fetch(...args),
): typeof fetch {
  return async (input, init) => {
    const respuesta = await fetchBase(input, init);
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;

    if (respuesta.status !== 401 || esPedidoDeAuth(url)) {
      return respuesta;
    }

    const auth = obtenerAuth();
    const { data, error } = await auth.refreshSession();

    if (error || !data.session) {
      await auth.signOut().catch(() => undefined);
      return respuesta;
    }

    return fetchBase(input, conToken(init, data.session.access_token));
  };
}
