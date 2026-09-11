import { Producto } from '../types';
import { CategoriaProducto } from '../constants/categoriasProductos';
import { supabase } from './supabase';

const TABLA_PRODUCTOS = 'productos';
const IMAGE_FALLBACK = 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=500';

const CATEGORY_ID_BY_NAME: Record<string, number> = {
  Camisas: 1,
  Jeans: 2,
  Vestidos: 3,
  Botas: 4,
  Short: 5,
  Camperas: 6,
};

const CATEGORY_NAME_BY_ID: Record<number, string> = {
  1: 'Camisas',
  2: 'Jeans',
  3: 'Vestidos',
  4: 'Botas',
  5: 'Short',
  6: 'Camperas',
};

interface ProductoRow {
  productoid: number;
  nombre: string;
  descripcion: string;
  precio: number;
  stock: number | null;
  categoriaid: number | null;
  imagen_url: string | null;
  imagenes: string[] | null;
  talles: string[] | null;
  colores: string[] | null;
  tipo_prenda: CategoriaProducto['tipoPrenda'] | null;
  temporada: CategoriaProducto['temporada'] | null;
  publico: CategoriaProducto['publico'] | null;
}

interface ProductoPersistData {
  nombre: string;
  descripcion: string;
  precio: number;
  stock: number;
  categoriaid: number;
  imagen_url: string;
  imagenes: string[];
  talles: string[];
  colores: string[];
  tipo_prenda: CategoriaProducto['tipoPrenda'];
  temporada: CategoriaProducto['temporada'];
  publico: CategoriaProducto['publico'];
}

export interface ProductoInput {
  nombre: string;
  precio: number;
  imagen: string;
  tipoPrenda: CategoriaProducto['tipoPrenda'];
  temporada: CategoriaProducto['temporada'];
  publico: CategoriaProducto['publico'];
  disponible: boolean;
  talle: string[];
  colores: string[];
  descripcion: string;
}

function assertSupabaseConfigured() {
  if (!supabase) {
    throw new Error('Supabase no esta configurado. Revisa EXPO_PUBLIC_SUPABASE_URL y EXPO_PUBLIC_SUPABASE_ANON_KEY.');
  }

  return supabase;
}

function legacyCategoryName(tipoPrenda: CategoriaProducto['tipoPrenda']) {
  const names: Record<CategoriaProducto['tipoPrenda'], string> = {
    Camisa: 'Camisas',
    Pantalón: 'Jeans',
    Campera: 'Camperas',
    Remera: 'Camisas',
    Buzo: 'Camperas',
    Vestido: 'Vestidos',
    Falda: 'Vestidos',
    Short: 'Short',
    Calzado: 'Botas',
    Accesorio: 'Camisas',
  };
  return names[tipoPrenda];
}

function mapRowToProducto(row: ProductoRow): Producto {
  const categoria =
    (row.categoriaid ? CATEGORY_NAME_BY_ID[row.categoriaid] : undefined) ||
    'Camisas';
  const categoriaProducto = row.tipo_prenda && row.temporada && row.publico
    ? { tipoPrenda: row.tipo_prenda, temporada: row.temporada, publico: row.publico }
    : undefined;

  const imagenes = (row.imagenes ?? []).filter(Boolean);
  const imagenPrincipal = imagenes[0] || row.imagen_url || IMAGE_FALLBACK;

  return {
    id: row.productoid.toString(),
    nombre: row.nombre,
    precio: row.precio,
    imagen: imagenPrincipal,
    imagenes,
    categoria,
    categoriaProducto,
    disponible: (row.stock ?? 0) > 0,
    talle: row.talles ?? [],
    colores: row.colores ?? [],
    descripcion: row.descripcion,
  };
}

function mapInputToPersistData(payload: ProductoInput): ProductoPersistData {
  const categoriaProducto: CategoriaProducto = {
    tipoPrenda: payload.tipoPrenda,
    temporada: payload.temporada,
    publico: payload.publico,
  };
  const categoria = legacyCategoryName(categoriaProducto.tipoPrenda);
  return {
    nombre: payload.nombre,
    descripcion: payload.descripcion.trim(),
    precio: payload.precio,
    stock: payload.disponible ? 1 : 0,
    categoriaid: CATEGORY_ID_BY_NAME[categoria] ?? 1,
    imagen_url: payload.imagen.trim(),
    imagenes: payload.imagen.trim() ? [payload.imagen.trim()] : [],
    talles: payload.talle,
    colores: payload.colores,
    tipo_prenda: categoriaProducto.tipoPrenda,
    temporada: categoriaProducto.temporada,
    publico: categoriaProducto.publico,
  };
}

export async function getProductos() {
  const client = assertSupabaseConfigured();

  const { data, error } = await client
    .from(TABLA_PRODUCTOS)
    .select('productoid, nombre, descripcion, precio, stock, categoriaid, imagen_url, imagenes, talles, colores, tipo_prenda, temporada, publico')
    .order('productoid', { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? []).map((row) => mapRowToProducto(row as ProductoRow));
}

export async function getProductoById(id: string) {
  const client = assertSupabaseConfigured();
  const productoid = Number(id);

  if (!Number.isFinite(productoid)) {
    return null;
  }

  const { data, error } = await client
    .from(TABLA_PRODUCTOS)
    .select('productoid, nombre, descripcion, precio, stock, categoriaid, imagen_url, imagenes, talles, colores, tipo_prenda, temporada, publico')
    .eq('productoid', productoid)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    return null;
  }

  return mapRowToProducto(data as ProductoRow);
}

export async function createProducto(payload: ProductoInput) {
  const client = assertSupabaseConfigured();
  const dataToInsert = mapInputToPersistData(payload);

  const { data, error } = await client
    .from(TABLA_PRODUCTOS)
    .insert(dataToInsert)
    .select('productoid, nombre, descripcion, precio, stock, categoriaid, imagen_url, imagenes, talles, colores, tipo_prenda, temporada, publico')
    .single();

  if (error) {
    throw error;
  }

  return mapRowToProducto(data as ProductoRow);
}

export async function updateProducto(id: string, payload: ProductoInput) {
  const client = assertSupabaseConfigured();
  const productoid = Number(id);

  if (!Number.isFinite(productoid)) {
    throw new Error('ID de producto invalido.');
  }

  const dataToUpdate = mapInputToPersistData(payload);

  const { data, error } = await client
    .from(TABLA_PRODUCTOS)
    .update(dataToUpdate)
    .eq('productoid', productoid)
    .select('productoid, nombre, descripcion, precio, stock, categoriaid, imagen_url, imagenes, talles, colores, tipo_prenda, temporada, publico')
    .single();

  if (error) {
    throw error;
  }

  return mapRowToProducto(data as ProductoRow);
}

export async function deleteProducto(id: string) {
  const client = assertSupabaseConfigured();
  const productoid = Number(id);

  if (!Number.isFinite(productoid)) {
    throw new Error('ID de producto invalido.');
  }

  const { error } = await client.from(TABLA_PRODUCTOS).delete().eq('productoid', productoid);

  if (error) {
    throw error;
  }
}

export function subscribeToProductos(onChange: () => void) {
  const client = assertSupabaseConfigured();

  const channel = client
    .channel('productos-realtime')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: TABLA_PRODUCTOS },
      () => onChange()
    )
    .subscribe();

  return () => {
    client.removeChannel(channel);
  };
}
