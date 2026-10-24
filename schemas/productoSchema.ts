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

  descuentoActivo: z.boolean().default(false),

  descuentoPorcentaje: z
    .coerce
    .number()
    .min(0, 'El descuento no puede ser negativo.')
    .max(100, 'El descuento no puede superar el 100%.')
    .default(0),

  stock: z
    .coerce
    .number()
    .int('El stock debe ser un número entero.')
    .min(0, 'El stock no puede ser negativo.'),

  // La imagen es OPCIONAL para el MVP.
  // Si está vacía, la publicación igualmente puede guardarse.
  imagen: z.union([
    z.literal(''),
    z.string().url('Ingresa una URL de imagen valida.'),
  ]),

  // Hasta 5 imágenes; la primera es la principal. `imagen` queda como la principal.
  imagenes: z.array(z.string().url('Imagen invalida.')).max(5, 'Podés subir hasta 5 imágenes.').default([]),

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

  // Dirección de la tienda: GPS o carga manual. Opcional.
  direccion: z.string().trim().optional(),

  descripcion: z
    .string()
    .trim()
    .min(10, 'La descripcion debe tener al menos 10 caracteres.'),
}).superRefine((values, context) => {
  if (values.descuentoActivo && values.descuentoPorcentaje <= 0) {
    context.addIssue({
      code: 'custom',
      path: ['descuentoPorcentaje'],
      message: 'Ingresa un descuento mayor a 0%.',
    });
  }
});

export type ProductoFormValues = z.input<typeof productoSchema>;

export type ProductoFormOutput = z.output<typeof productoSchema>;