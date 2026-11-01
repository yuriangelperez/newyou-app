import { quitarAltura } from '../services/locationService';

describe('quitarAltura (búsqueda aproximada en el mapa)', () => {
  it('saca sólo la altura de la calle', () => {
    expect(quitarAltura('Adolfo Alsina 3048, Manuel Alberti')).toBe('Adolfo Alsina, Manuel Alberti');
    expect(quitarAltura('Av. Tratado del Pilar 1000, Pilar')).toBe('Av. Tratado del Pilar, Pilar');
    expect(quitarAltura('Calle 12 N° 345, La Plata')).toBe('Calle 12, La Plata');
  });

  it('no toca la localidad', () => {
    expect(quitarAltura('San Martín 50, Villa Rosa, Pilar')).toBe('San Martín, Villa Rosa, Pilar');
  });
});
