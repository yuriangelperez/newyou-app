import { CategoriaProducto } from '../constants/categoriasProductos';

export interface Producto {
  id: string;
  nombre: string;
  precio: number;
  imagen: string;
  imagenes?: string[];
  categoria: string;
  categoriaProducto?: CategoriaProducto;
  disponible: boolean;
  stock: number;
  talle?: string[];
  colores?: string[];
  descripcion: string;
}

export interface Usuario {
  id: string;
  nombre: string;
  email: string;
  role: 'vendedor' | 'comprador';
}