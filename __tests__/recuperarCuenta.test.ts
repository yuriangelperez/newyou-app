const mockSetSession = jest.fn();
const mockExchange = jest.fn();

jest.mock('../services/supabase', () => ({
  supabase: {
    auth: {
      setSession: (...args: unknown[]) => mockSetSession(...args),
      exchangeCodeForSession: (...args: unknown[]) => mockExchange(...args),
    },
  },
}));

import { abrirSesionDesdeEnlace } from '../services/auth';

beforeEach(() => {
  mockSetSession.mockReset().mockResolvedValue({ error: null });
  mockExchange.mockReset().mockResolvedValue({ error: null });
});

describe('abrirSesionDesdeEnlace', () => {
  it('usa los tokens del fragmento (flujo implícito)', async () => {
    const { error } = await abrirSesionDesdeEnlace(
      'newyou://nueva-contrasena#access_token=AAA&refresh_token=BBB&type=recovery',
    );
    expect(error).toBeNull();
    expect(mockSetSession).toHaveBeenCalledWith({ access_token: 'AAA', refresh_token: 'BBB' });
  });

  it('canjea el código del flujo PKCE', async () => {
    await abrirSesionDesdeEnlace('http://localhost:8081/nueva-contrasena?code=XYZ');
    expect(mockExchange).toHaveBeenCalledWith('XYZ');
  });

  it('traduce el error que manda Supabase (enlace vencido)', async () => {
    const { error } = await abrirSesionDesdeEnlace(
      'newyou://nueva-contrasena#error=access_denied&error_description=Email+link+is+invalid+or+has+expired',
    );
    expect(error?.message).toBe('El enlace no es válido o ya venció. Pedí uno nuevo.');
    expect(mockSetSession).not.toHaveBeenCalled();
  });

  it('sin datos en el enlace, pide uno nuevo', async () => {
    const { error } = await abrirSesionDesdeEnlace('newyou://nueva-contrasena');
    expect(error?.message).toMatch(/no es válido/);
    const sinUrl = await abrirSesionDesdeEnlace(null);
    expect(sinUrl.error?.message).toMatch(/enlace del correo/);
  });
});
