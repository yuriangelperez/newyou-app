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
  /** Prenda de empresa (null = de un particular). */
  empresaId?: number | null;
  sedeId?: number | null;
  creadoPor?: string;
  /** Quién la vende (migración 15); falta si la base todavía no la tiene. */
  vendedor?: VendedorProducto;
  /** Borrador = sin foto o guardada sin conexión: no sale en el catálogo (migración 16). */
  estado?: 'publicada' | 'borrador';
  /** Hasta cuándo se guarda el borrador (después se borra). */
  borradorVence?: string | null;
}

export interface VendedorProducto {
  tipo: 'empresa' | 'particular';
  nombre: string;
  /** Slug de la tienda, sólo para empresas. */
  slug?: string;
  verificada: boolean;
}

export function calcularPrecioFinal(producto: Pick<Producto, 'precio' | 'descuentoPorcentaje'>) {
  return Math.round(producto.precio * (1 - producto.descuentoPorcentaje / 100));
}

export interface Usuario {
  id: string;
  nombre: string;
  email: string;
  role: 'particular' | 'comprador';
}