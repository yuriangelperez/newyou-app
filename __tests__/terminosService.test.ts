const mockMaybeSingle = jest.fn();
const mockRpc = jest.fn();
const consulta = {
  select: () => consulta,
  eq: () => consulta,
  maybeSingle: () => mockMaybeSingle(),
};
jest.mock('../services/supabase', () => ({
  supabase: { from: () => consulta, rpc: (...args: unknown[]) => mockRpc(...args) },
}));

import { VERSION_TERMINOS } from '../constants/terminos';
import { faltaAceptarTerminos, versionAceptadaEnRegistro } from '../services/terminosService';

beforeEach(() => {
  mockMaybeSingle.mockReset();
  mockRpc.mockReset().mockResolvedValue({ error: null });
});

describe('faltaAceptarTerminos', () => {
  it('no pide nada si ya aceptó la versión vigente', async () => {
    mockMaybeSingle.mockResolvedValue({ data: { version: VERSION_TERMINOS }, error: null });
    await expect(faltaAceptarTerminos({ user_metadata: {} })).resolves.toBe(false);
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it('guarda la aceptación del registro sin volver a preguntar', async () => {
    mockMaybeSingle.mockResolvedValue({ data: null, error: null });
    await expect(faltaAceptarTerminos({ user_metadata: { terminos_version: VERSION_TERMINOS } })).resolves.toBe(false);
    expect(mockRpc).toHaveBeenCalledWith('aceptar_terminos', { p_tipo: 'comprador', p_version: VERSION_TERMINOS });
  });

  it('pide aceptar si no los aceptó o aceptó una versión vieja', async () => {
    mockMaybeSingle.mockResolvedValue({ data: null, error: null });
    await expect(faltaAceptarTerminos({ user_metadata: { terminos_version: '2020-01-01' } })).resolves.toBe(true);
    await expect(faltaAceptarTerminos({ user_metadata: {} })).resolves.toBe(true);
    expect(mockRpc).not.toHaveBeenCalled();
  });
});

describe('versionAceptadaEnRegistro', () => {
  it('lee la versión de los metadatos', () => {
    expect(versionAceptadaEnRegistro({ user_metadata: { terminos_version: 'x' } })).toBe('x');
    expect(versionAceptadaEnRegistro({ user_metadata: {} })).toBeNull();
    expect(versionAceptadaEnRegistro(null)).toBeNull();
  });
});
