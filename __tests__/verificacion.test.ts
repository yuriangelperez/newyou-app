import { mapVerificacion, textoPlazo } from '../services/verificacionService';
import { enVerificacion } from '../types';

jest.mock('../services/supabase', () => ({ supabase: {} }));
jest.mock('../services/storageService', () => ({ pickImageFromCamera: jest.fn(), uploadProductImage: jest.fn() }));

const ahora = new Date('2026-11-09T12:00:00Z');

describe('textoPlazo', () => {
  it('cuenta las horas o días que faltan', () => {
    expect(textoPlazo('2026-11-09T17:00:00Z', ahora)).toBe('Vence en 5 h');
    expect(textoPlazo('2026-11-12T12:00:00Z', ahora)).toBe('Vence en 3 días');
  });

  it('avisa cuando el plazo ya venció', () => {
    expect(textoPlazo('2026-11-07T12:00:00Z', ahora)).toBe('Venció hace 2 días');
    expect(textoPlazo(null, ahora)).toBe('Sin plazo');
  });
});

describe('enVerificacion', () => {
  const verificacion = { codigo: '1234', fotoUrl: null, motivo: null, venceAt: null };

  it('una usada sólo se compra aprobada', () => {
    expect(enVerificacion({ condicion: 'usado', verificacion: { ...verificacion, estado: 'pendiente' } })).toBe(true);
    expect(enVerificacion({ condicion: 'usado', verificacion: { ...verificacion, estado: 'rechazada' } })).toBe(true);
    expect(enVerificacion({ condicion: 'usado', verificacion: { ...verificacion, estado: 'aprobada' } })).toBe(false);
  });

  it('las nuevas y las de una base sin la migración no se bloquean', () => {
    expect(enVerificacion({ condicion: 'nuevo', verificacion: { ...verificacion, estado: 'no_aplica' } })).toBe(false);
    expect(enVerificacion({ condicion: 'usado' })).toBe(false);
  });
});

describe('mapVerificacion', () => {
  it('usa imagen_url si no hay galería', () => {
    const item = mapVerificacion({
      producto_id: 9,
      nombre: 'Campera',
      descripcion: null,
      imagenes: [],
      imagen_url: 'https://x/foto.jpg',
      estado: 'pendiente',
      codigo: '0420',
      foto_codigo: null,
      vence_at: null,
      vencida: null,
      motivo: null,
      vendedor: 'ana',
    });
    expect(item.imagenes).toEqual(['https://x/foto.jpg']);
    expect(item.vencida).toBe(false);
    expect(item.descripcion).toBe('');
  });
});
