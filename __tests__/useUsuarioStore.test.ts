import { AuthRetryableFetchError, type User } from '@supabase/supabase-js';

import { selectPuedeVender, UsuarioSesion, useUsuarioStore } from '../stores/useUsuarioStore';

jest.mock('../services/supabase', () => ({ supabase: { auth: {} } }));
jest.mock('../services/empresasService', () => ({ esAdminPlataforma: async () => false }));

const mockSupabase: { auth: any } = jest.requireMock('../services/supabase').supabase;

const usuario = (role: UsuarioSesion['role']): UsuarioSesion => ({
  id: '1',
  nombre: 'Ana',
  email: 'ana@mail.com',
  role,
});

describe('selectPuedeVender', () => {
  it('permite vender a un particular', () => {
    expect(selectPuedeVender({ usuario: usuario('particular') })).toBe(true);
  });

  it('no permite vender a un comprador ni sin sesión', () => {
    expect(selectPuedeVender({ usuario: usuario('comprador') })).toBe(false);
    expect(selectPuedeVender({ usuario: null })).toBe(false);
  });
});

describe('hidratarDesdeAuthUser', () => {
  const authUser = {
    id: 'u1',
    email: 'ana@mail.com',
    user_metadata: { username: 'ana', role: 'particular' },
  } as unknown as User;

  beforeEach(() => {
    useUsuarioStore.setState({ usuario: null });
    mockSupabase.auth = { getUser: jest.fn(), signOut: jest.fn() };
  });

  it('con sesión guardada muestra al usuario sin esperar a la red', () => {
    mockSupabase.auth.getUser.mockReturnValue(new Promise(() => {}));
    void useUsuarioStore.getState().hidratarDesdeAuthUser(authUser);

    expect(useUsuarioStore.getState().usuario).toMatchObject({ nombre: 'ana', role: 'particular' });
  });

  it('sin red mantiene la sesión en vez de cerrarla', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: new AuthRetryableFetchError('sin red', 0),
    });
    await useUsuarioStore.getState().hidratarDesdeAuthUser(authUser);

    expect(mockSupabase.auth.signOut).not.toHaveBeenCalled();
    expect(useUsuarioStore.getState().usuario?.nombre).toBe('ana');
  });
});
