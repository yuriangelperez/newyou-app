import { mapDummyAProducto } from '../services/productosApiService';

jest.mock('../services/supabase', () => ({ supabase: { auth: {} } }));

describe('servicio de productos con API REST (Clase 12)', () => {
  it('adapta un producto de DummyJSON al modelo de la app', () => {
    const producto = mapDummyAProducto({
      id: 3,
      title: 'Vestido floreado',
      description: 'Vestido de verano',
      price: 49.99,
      discountPercentage: 12.4,
      stock: 0,
      category: 'womens-dresses',
      thumbnail: 'https://cdn.dummyjson.com/x.png',
      images: ['a', 'b', 'c', 'd', 'e', 'f'],
    });

    expect(producto).toMatchObject({
      id: 'dummy-3',
      nombre: 'Vestido floreado',
      precio: 49990,
      descuentoPorcentaje: 12,
      disponible: false,
      imagen: 'https://cdn.dummyjson.com/x.png',
    });
    expect(producto.imagenes).toHaveLength(5);
  });
});
