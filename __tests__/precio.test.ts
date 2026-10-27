import { calcularComision, formatearPrecioInput, parsearPrecio } from '../utils/precio';
import { normalizarTexto } from '../utils/texto';

describe('precio en formato argentino', () => {
  it('parsea miles con punto y decimales con coma', () => {
    expect(parsearPrecio('35.000')).toEqual({ ok: true, valor: 35000 });
    expect(parsearPrecio('1.250.000')).toEqual({ ok: true, valor: 1250000 });
    expect(parsearPrecio('1.500,5')).toEqual({ ok: true, valor: 1500.5 });
  });

  it('rechaza puntos mal ubicados y comas de más', () => {
    expect(parsearPrecio('35.00').ok).toBe(false);
    expect(parsearPrecio('1,5,0').ok).toBe(false);
    expect(parsearPrecio('').ok).toBe(false);
  });

  it('vuelve a mostrar el número como se escribe', () => {
    expect(formatearPrecioInput(35000)).toBe('35.000');
    expect(formatearPrecioInput(1500.5)).toBe('1.500,50');
  });

  it('calcula la comisión del 10% y lo que recibe el vendedor', () => {
    expect(calcularComision(35000)).toEqual({ comision: 3500, ganancia: 31500 });
  });
});

describe('normalizarTexto', () => {
  it('ignora tildes y mayúsculas', () => {
    expect(normalizarTexto(' Pantalón ')).toBe('pantalon');
  });
});
