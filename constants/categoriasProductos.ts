export const TIPOS_PRENDA = [
  'Pantalón',
  'Torso',
  'Vestido',
  'Falda',
  'Short',
  'Calzado',
  'Accesorio',
  'Interior',
  'Equipamiento',
] as const;

export const TEMPORADAS = ['Todo el año', 'Primavera', 'Verano', 'Otoño', 'Invierno'] as const;

export const PUBLICOS = ['Adulto', 'Infantil'] as const;

export type TipoPrenda = (typeof TIPOS_PRENDA)[number];
export type Temporada = (typeof TEMPORADAS)[number];
export type Publico = (typeof PUBLICOS)[number];

export interface CategoriaProducto {
  tipoPrenda: TipoPrenda;
  temporada: Temporada;
  publico: Publico;
}

export const CATEGORIA_PRODUCTO_POR_DEFECTO: CategoriaProducto = {
  tipoPrenda: 'Torso',
  temporada: 'Todo el año',
  publico: 'Adulto',
};

export function categoriaProductoLabel(categoria: CategoriaProducto) {
  return `${categoria.tipoPrenda} · ${categoria.temporada} · ${categoria.publico}`;
}
