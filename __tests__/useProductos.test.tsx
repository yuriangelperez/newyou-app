import { renderHook, waitFor } from '@testing-library/react-native';

import { useProductos } from '../hooks/useProductos';
import type { Producto } from '../types';

// Nunca se consulta la base real: el servicio de Supabase se reemplaza por un mock.
const mockGetProductos = jest.fn<Promise<Producto[]>, []>();
jest.mock('../services/productosService', () => ({
  getProductos: () => mockGetProductos(),
  subscribeToProductos: () => () => undefined,
}));
jest.mock('expo-router', () => ({ useFocusEffect: jest.fn() }));

const prenda = (id: string, nombre: string): Producto => ({
  id,
  nombre,
  precio: 1000,
  descuentoPorcentaje: 0,
  imagen: '',
  categoria: 'Remeras',
  disponible: true,
  stock: 3,
  descripcion: '',
});

describe('useProductos', () => {
  it('carga las prendas que devuelve el backend', async () => {
    mockGetProductos.mockResolvedValue([prenda('1', 'Campera'), prenda('2', 'Jean')]);

    const { result } = await renderHook(() => useProductos());

    await waitFor(() => expect(result.current.cargando).toBe(false));
    expect(result.current.productos).toHaveLength(2);
    expect(result.current.productos[0].nombre).toBe('Campera');
    expect(result.current.error).toBeNull();
  });

  it('muestra el error si el backend falla', async () => {
    mockGetProductos.mockRejectedValue(new Error('Sin conexión'));

    const { result } = await renderHook(() => useProductos());

    await waitFor(() => expect(result.current.cargando).toBe(false));
    expect(result.current.error).toBe('Sin conexión');
    expect(result.current.productos).toEqual([]);
  });
});
