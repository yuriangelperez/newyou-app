import { z } from 'zod';

import {
  PUBLICOS,
  TEMPORADAS,
  TIPOS_PRENDA,
} from '../constants/categoriasProductos';
import { tallesPara, mismoTalle } from '../constants/talles';
import { parsearPrecio } from '../utils/precio';

export const NOMBRE_MAX = 30;
export const DESCRIPCION_MAX = 30;

export const productoSchema = z.object({
  nombre: z
    .string()
    .trim()
    .min(3, 'El nombre debe tener al menos 3 caracteres.')
    .max(NOMBRE_MAX, `El nombre puede tener hasta ${NOMBRE_MAX} caracteres.`),

  // Formato argentino: "35.000" son treinta y cinco mil y "1.500,50" lleva coma decimal.
  precio: z.union([z.string(), z.number()]).transform((valor, context) => {
    const resultado = parsearPrecio(valor);
    if (!resultado.ok) {
      context.addIssue({ code: 'custom', message: resultado.mensaje });
      return z.NEVER;
    }
    if (resultado.valor <= 0) {
      context.addIssue({ code: 'custom', message: 'El precio debe ser mayor a 0.' });
      return z.NEVER;
    }
    return resultado.valor;
  }),

  descuentoActivo: z.boolean().default(false),

  descuentoPorcentaje: z
    .coerce
    .number({ error: 'Ingresá sólo números.' })
    .min(0, 'El descuento no puede ser negativo.')
    .max(100, 'El descuento no puede superar el 100%.')
    .default(0),

  stock: z
    .coerce
    .number({ error: 'Ingresá sólo números.' })
    .int('El stock debe ser un número entero.')
    .min(0, 'El stock no puede ser negativo.'),

  // La foto es obligatoria para publicar: sin foto la prenda se guarda como borrador.
  imagen: z.union([
    z.literal(''),
    z.string().url('Ingresa una URL de imagen valida.'),
  ]),

  // Hasta 5 imágenes; la primera es la principal. `imagen` queda como la principal.
  imagenes: z.array(z.string().url('Imagen invalida.')).max(5, 'Podés subir hasta 5 imágenes.').default([]),

  tipoPrenda: z.enum(TIPOS_PRENDA),

  // Las categorías salen de la tabla `categorias`: una nueva en Supabase aparece sola.
  categoria: z.string().trim().min(1, 'Elegí una categoría.'),

  temporada: z.enum(TEMPORADAS),

  publico: z.enum(PUBLICOS),

  disponible: z.boolean(),

  // Talles elegidos con chips, separados por comas ("S, M, L" o "38, 39").
  talle: z
    .string()
    .trim()
    .min(1, 'Elegí al menos un talle.'),

  colores: z
    .string()
    .trim()
    .min(1, 'Ingresa al menos un color.'),

  // Dirección de la tienda: GPS o carga manual. Opcional.
  direccion: z.string().trim().optional(),

  descripcion: z
    .string()
    .trim()
    .min(10, 'La descripcion debe tener al menos 10 caracteres.')
    .max(DESCRIPCION_MAX, `La descripción puede tener hasta ${DESCRIPCION_MAX} caracteres.`),
}).superRefine((values, context) => {
  if (values.descuentoActivo && values.descuentoPorcentaje <= 0) {
    context.addIssue({
      code: 'custom',
      path: ['descuentoPorcentaje'],
      message: 'Ingresa un descuento mayor a 0%.',
    });
  }

  // Sólo se aceptan los talles de los filtros (ropa o calzado según la categoría).
  const validos = tallesPara(values.tipoPrenda === 'Calzado');
  const invalidos = values.talle
    .split(',')
    .map((talle) => talle.trim())
    .filter((talle) => talle && !validos.some((valido) => mismoTalle(valido, talle)));
  if (invalidos.length > 0) {
    context.addIssue({
      code: 'custom',
      path: ['talle'],
      message: `Talle no válido para esta prenda: ${invalidos.join(', ')}.`,
    });
  }
});

export type ProductoFormValues = z.input<typeof productoSchema>;

export type ProductoFormOutput = z.output<typeof productoSchema>;
