import { Producto } from '../types';
import { api } from './api';

interface DummyProducto {
  id: number;
  title: string;
  description: string;
  price: number;
  discountPercentage: number;
  stock: number;
  category: string;
  thumbnail: string;
  images: string[];
}

interface DummyRespuesta {
  products: DummyProducto[];
}

/** Adapta un producto de DummyJSON al modelo de la app: la UI no se entera del cambio. */
export function mapDummyAProducto(item: DummyProducto): Producto {
  return {
    id: `dummy-${item.id}`,
    nombre: item.title,
    descripcion: item.description,
    // DummyJSON trae dólares: se pasa a un precio en pesos aproximado para la demo.
    precio: Math.round(item.price * 1000),
    descuentoPorcentaje: Math.round(item.discountPercentage),
    stock: item.stock,
    disponible: item.stock > 0,
    categoria: item.category,
    imagen: item.thumbnail,
    imagenes: item.images.slice(0, 5),
  };
}

/**
 * Taller de la Clase 12 (arquitectura agnóstica del backend): misma firma que
 * `getProductos` de `productosService.ts`, pero contra la API REST pública de
 * DummyJSON con Axios. Se activa con EXPO_PUBLIC_FUENTE_PRODUCTOS=dummyjson.
 */
export async function getProductos(): Promise<Producto[]> {
  const { data } = await api.get<DummyRespuesta>('/products/category/womens-dresses', {
    params: { limit: 30 },
  });
  return data.products.map(mapDummyAProducto);
}
