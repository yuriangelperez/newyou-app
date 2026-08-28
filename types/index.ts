// types/index.ts

export interface Producto {
  id: string;
  nombre: string;
  precio: number;
  imagen: string;
  categoria: string;
  disponible: boolean;
  talle?: string[];
  descripcion: string;
}

export interface Usuario {
  id: string;
  nombre: string;
  email: string;
  rol: 'vendedor' | 'comprador';
}