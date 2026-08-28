// data/mockData.ts
import { Producto } from '../types';

export const PRODUCTOS_MOCK: Producto[] = [
  {
    id: '1',
    nombre: 'Camisa Lino Premium',
    precio: 25000,
    imagen: 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=500',
    categoria: 'Camisas',
    disponible: true,
    talle: ['S', 'M', 'L'],
    descripcion: 'Camisa de lino 100% ideal para el verano, fresca y con botones de madera.'
  },
  {
    id: '2',
    nombre: 'Jean Classic Slim',
    precio: 38000,
    imagen: 'https://images.unsplash.com/photo-1541099649105-f69ad21f3246?w=500',
    categoria: 'Jeans',
    disponible: true,
    talle: ['30', '32', '34'],
    descripcion: 'Jeans de denim rígido, corte slim fit con un prelavado clásico.'
  },
  {
    id: '3',
    nombre: 'Vestido Floreado Ibiza',
    precio: 45000,
    imagen: 'https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?w=500',
    categoria: 'Vestidos',
    disponible: false, // Caso Edge para testing de conditional rendering
    talle: ['S', 'M'],
    descripcion: 'Vestido corto floreado con tirantes regulables y espalda abierta.'
  },
  {
    id: '4',
    nombre: 'Bota Cuero Terra',
    precio: 85000,
    imagen: 'https://images.unsplash.com/photo-1520639888713-7851133b1ed0?w=500',
    categoria: 'Botas',
    disponible: true,
    talle: ['37', '38', '39', '40'],
    descripcion: 'Botas de cuero vacuno legítimo en tono terra, hechas a mano.'
  },
  {
    id: '5',
    nombre: 'Short Denim Vintage',
    precio: 18000,
    imagen: 'https://images.unsplash.com/photo-1591195853828-11db59a44f6b?w=500',
    categoria: 'Short',
    disponible: true,
    talle: ['36', '38', '40'],
    descripcion: 'Short de jean tiro alto con terminación desflecada.'
  },
  {
    id: '6',
    nombre: 'Campera Bomber Oversize',
    precio: 62000,
    imagen: 'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=500',
    categoria: 'Camperas',
    disponible: true,
    talle: ['M', 'L', 'XL'],
    descripcion: 'Campera estilo bomber con abrigo interno y puños elastizados.'
  }
];