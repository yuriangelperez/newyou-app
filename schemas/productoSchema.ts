import { z } from 'zod';

import {
  PUBLICOS,
  CATEGORIAS_PRODUCTO,
  TEMPORADAS,
  TIPOS_PRENDA,
} from '../constants/categoriasProductos';

export const productoSchema = z.object({
  nombre: z
    .string()
    .trim()
    .min(3, 'El nombre debe tener al menos 3 caracteres.'),

  precio: z
    .coerce
    .number()
    .positive('El precio debe ser mayor a 0.'),

  stock: z
    .coerce
    .number()
    .int('El stock debe ser un número entero.')
    .min(0, 'El stock no puede ser negativo.'),

  imagen: z
    .string()
    .url('Ingresa una URL de imagen valida.'),

  tipoPrenda: z.enum(TIPOS_PRENDA),

  categoria: z.enum(CATEGORIAS_PRODUCTO),

  temporada: z.enum(TEMPORADAS),

  publico: z.enum(PUBLICOS),

  disponible: z.boolean(),

  talle: z
    .string()
    .trim()
    .min(1, 'Ingresa al menos un talle.'),

  colores: z
    .string()
    .trim()
    .min(1, 'Ingresa al menos un color.'),

  descripcion: z
    .string()
    .trim()
    .min(10, 'La descripcion debe tener al menos 10 caracteres.'),
});

export type ProductoFormValues = z.input<typeof productoSchema>;

export type ProductoFormOutput = z.output<typeof productoSchema>;