import { crearFetchConSesion } from '../services/interceptor';

const respuesta = (status: number) => ({ status }) as Response;

function armar(estados: number[], refresco: { token?: string; error?: Error }) {
  const fetchBase = jest.fn(async () => respuesta(estados.shift() ?? 200));
  const auth = {
    refreshSession: jest.fn(async () => ({
      data: { session: refresco.token ? { access_token: refresco.token } : null },
      error: refresco.error ?? null,
    })),
    signOut: jest.fn(async () => ({ error: null })),
  };
  const fetchConSesion = crearFetchConSesion(() => auth as never, fetchBase as never);
  return { fetchBase, auth, fetchConSesion };
}

const URL_REST = 'https://x.supabase.co/rest/v1/productos';

describe('interceptor de Supabase', () => {
  it('deja pasar las respuestas que no son 401', async () => {
    const { fetchConSesion, auth } = armar([200], {});

    await expect(fetchConSesion(URL_REST)).resolves.toMatchObject({ status: 200 });
    expect(auth.refreshSession).not.toHaveBeenCalled();
  });

  it('ante un 401 renueva el token y reintenta con el nuevo', async () => {
    const { fetchConSesion, fetchBase } = armar([401, 200], { token: 'nuevo' });

    await expect(
      fetchConSesion(URL_REST, { headers: { Authorization: 'Bearer viejo' } }),
    ).resolves.toMatchObject({ status: 200 });

    const reintento = (fetchBase.mock.calls[1] as unknown as [string, RequestInit])[1];
    expect(new Headers(reintento.headers).get('Authorization')).toBe('Bearer nuevo');
  });

  it('si no puede renovar, cierra la sesión', async () => {
    const { fetchConSesion, auth } = armar([401], { error: new Error('refresh vencido') });

    await expect(fetchConSesion(URL_REST)).resolves.toMatchObject({ status: 401 });
    expect(auth.signOut).toHaveBeenCalled();
  });

  it('no intercepta los pedidos de auth (evita un bucle al renovar)', async () => {
    const { fetchConSesion, auth } = armar([401], { token: 'nuevo' });

    await fetchConSesion('https://x.supabase.co/auth/v1/token?grant_type=refresh_token');
    expect(auth.refreshSession).not.toHaveBeenCalled();
  });
});
