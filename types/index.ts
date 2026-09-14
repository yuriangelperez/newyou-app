import { CategoriaProducto } from '../constants/categoriasProductos';

export interface Producto {
  id: string;
  nombre: string;
  precio: number;
  descuentoPorcentaje: number;
  imagen: string;
  imagenes?: string[];
  categoria: string;
  categoriaId?: number;
  categoriaProducto?: CategoriaProducto;
  disponible: boolean;
  stock: number;
  talle?: string[];
  colores?: string[];
  descripcion: string;
}

export function calcularPrecioFinal(producto: Pick<Producto, 'precio' | 'descuentoPorcentaje'>) {
  return Math.round(producto.precio * (1 - producto.descuentoPorcentaje / 100));
}

export interface Usuario {
  id: string;
  nombre: string;
  email: string;
  role: 'vendedor' | 'comprador';
}