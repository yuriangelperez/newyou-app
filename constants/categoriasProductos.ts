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

export const CATEGORIAS_PRODUCTO = [
  'Camisas',
  'Camperas',
  'Buzos',
  'Faldas',
  'Pantalones',
  'Jeans',
  'Short',
  'Brasieres',
  'Boxers',
  'Cinturones',
  'Carteras',
  'Gorras',
  'Lentes',
  'Mochilas',
  'Botas',
  'Zapatillas',
  'Sandalias',
  'Mocasines',
] as const;

export type TipoPrenda = (typeof TIPOS_PRENDA)[number];
export type Temporada = (typeof TEMPORADAS)[number];
export type Publico = (typeof PUBLICOS)[number];
export type CategoriaProductoNombre = (typeof CATEGORIAS_PRODUCTO)[number];

export function tipoPrendaPorCategoria(categoria: CategoriaProductoNombre): TipoPrenda {
  if (['Camisas', 'Camperas', 'Buzos'].includes(categoria)) {
    return 'Torso';
  }

  if (['Pantalones', 'Jeans'].includes(categoria)) {
    return 'Pantalón';
  }

  if (['Brasieres', 'Boxers'].includes(categoria)) {
    return 'Interior';
  }

  if (['Botas', 'Zapatillas', 'Sandalias', 'Mocasines'].includes(categoria)) {
    return 'Calzado';
  }

  if (['Cinturones', 'Carteras', 'Gorras', 'Lentes', 'Mochilas'].includes(categoria)) {
    return 'Accesorio';
  }

  if (categoria === 'Faldas') {
    return 'Falda';
  }

  return 'Short';
}

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
