jest.mock('../services/supabase', () => ({ supabase: {} }));

import { selectPuedeVender, UsuarioSesion } from '../stores/useUsuarioStore';

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
