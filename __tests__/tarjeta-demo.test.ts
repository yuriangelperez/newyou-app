import { esTarjetaDePrueba } from '../utils/tarjeta';

describe('esTarjetaDePrueba (versión demo)', () => {
  it('acepta las tarjetas de prueba con o sin espacios', () => {
    expect(esTarjetaDePrueba('4509953566233704')).toBe(true);
    expect(esTarjetaDePrueba('4002 7686 9439 5619')).toBe(true);
  });

  it('rechaza cualquier otra tarjeta, aunque sea válida', () => {
    // Pasa Luhn, pero no es de prueba.
    expect(esTarjetaDePrueba('4111111111111111')).toBe(false);
    expect(esTarjetaDePrueba('')).toBe(false);
  });
});
