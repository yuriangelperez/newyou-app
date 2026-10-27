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
  'Vestidos',
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

  if (categoria === 'Vestidos') {
    return 'Vestido';
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

// Grupos de la pestaña Categorías. En Supabase cada categoría tiene su `grupo` (migración 16):
// una categoría nueva con grupo aparece sola en la app.
export const GRUPOS_CATEGORIA = ['TORSO', 'PIERNAS', 'INTERIOR', 'ACCESORIOS', 'CALZADO'] as const;
export type GrupoCategoria = (typeof GRUPOS_CATEGORIA)[number];

const TIPO_POR_GRUPO: Record<GrupoCategoria, TipoPrenda> = {
  TORSO: 'Torso',
  PIERNAS: 'Pantalón',
  INTERIOR: 'Interior',
  ACCESORIOS: 'Accesorio',
  CALZADO: 'Calzado',
};

export interface Categoria {
  id?: number;
  nombre: string;
  grupo: GrupoCategoria;
  imagen?: string;
}

/** Categorías que trae la app; se usan si no se puede leer la tabla y para las fotos. */
export const CATEGORIAS_BASE: Categoria[] = [
  { nombre: 'Camisas', grupo: 'TORSO', imagen: 'https://images.unsplash.com/photo-1603252109303-2751441dd157?w=600' },
  { nombre: 'Camperas', grupo: 'TORSO', imagen: 'https://images.unsplash.com/photo-1521223890158-f9f7c3d5d504?w=600' },
  { nombre: 'Buzos', grupo: 'TORSO', imagen: 'https://images.unsplash.com/photo-1512436991641-6745cdb1723f?w=600' },
  { nombre: 'Vestidos', grupo: 'TORSO', imagen: 'https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=600' },
  { nombre: 'Faldas', grupo: 'PIERNAS', imagen: 'https://images.unsplash.com/photo-1577900232427-18219b9166a0?w=600' },
  { nombre: 'Pantalones', grupo: 'PIERNAS', imagen: 'https://images.unsplash.com/photo-1473966968600-fa801b869a1a?w=600' },
  { nombre: 'Short', grupo: 'PIERNAS', imagen: 'https://images.unsplash.com/photo-1591195853828-11db59a44f6b?w=600' },
  { nombre: 'Jeans', grupo: 'PIERNAS', imagen: 'https://images.unsplash.com/photo-1541099649105-f69ad21f3246?w=600' },
  { nombre: 'Brasieres', grupo: 'INTERIOR', imagen: 'https://images.unsplash.com/photo-1610241519159-8a62634bac9a?w=600' },
  { nombre: 'Boxers', grupo: 'INTERIOR', imagen: 'https://images.unsplash.com/photo-1640765937555-6f413ed1d936?w=600' },
  { nombre: 'Cinturones', grupo: 'ACCESORIOS', imagen: 'https://images.unsplash.com/photo-1664286074176-5206ee5dc878?w=600' },
  { nombre: 'Carteras', grupo: 'ACCESORIOS', imagen: 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=600' },
  { nombre: 'Gorras', grupo: 'ACCESORIOS', imagen: 'https://images.unsplash.com/photo-1521369909029-2afed882baee?w=600' },
  { nombre: 'Lentes', grupo: 'ACCESORIOS', imagen: 'https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=600' },
  { nombre: 'Mochilas', grupo: 'ACCESORIOS', imagen: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=600' },
  { nombre: 'Botas', grupo: 'CALZADO', imagen: 'https://plus.unsplash.com/premium_photo-1729788891863-0d9b6f2b453b?w=600' },
  { nombre: 'Zapatillas', grupo: 'CALZADO', imagen: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600' },
  { nombre: 'Sandalias', grupo: 'CALZADO', imagen: 'https://images.unsplash.com/photo-1603487742131-4160ec999306?w=600' },
  { nombre: 'Mocasines', grupo: 'CALZADO', imagen: 'https://images.unsplash.com/photo-1616406432452-07bc5938759d?w=600' },
];

/** Tipo de prenda de cualquier categoría: las conocidas por nombre, las nuevas por su grupo. */
export function tipoPrendaDeCategoria(nombre: string, grupo?: GrupoCategoria | null): TipoPrenda {
  if ((CATEGORIAS_PRODUCTO as readonly string[]).includes(nombre)) {
    return tipoPrendaPorCategoria(nombre as CategoriaProductoNombre);
  }
  return grupo ? TIPO_POR_GRUPO[grupo] : 'Accesorio';
}
