import { formatearDistancia, ordenarPorDistancia, radioDeCercania } from '../utils/cercania';

describe('radioDeCercania', () => {
  it('lee el radio de cada opción', () => {
    expect(radioDeCercania('Cualquier distancia')).toBeNull();
    expect(radioDeCercania('Hasta 2 km')).toBe(2);
    expect(radioDeCercania('Hasta 25 km')).toBe(25);
  });
});

describe('formatearDistancia', () => {
  it('muestra metros debajo de 1 km y km con coma decimal', () => {
    expect(formatearDistancia(0.32)).toBe('a 300 m');
    expect(formatearDistancia(0.02)).toBe('a 100 m');
    expect(formatearDistancia(1.2)).toBe('a 1,2 km');
    expect(formatearDistancia(12)).toBe('a 12 km');
  });
});

describe('ordenarPorDistancia', () => {
  it('ordena de más cerca a más lejos y deja al final las que no tienen distancia', () => {
    const productos = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
    expect(ordenarPorDistancia(productos, { a: 5, c: 1.5 }).map((p) => p.id)).toEqual(['c', 'a', 'b']);
  });
});
