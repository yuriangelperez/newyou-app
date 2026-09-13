import { Producto } from '../types';
import { CategoriaProducto } from '../constants/categoriasProductos';
import { supabase } from './supabase';

const TABLA_PRODUCTOS = 'productos';

const IMAGE_FALLBACK =
  'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=500';

const CATEGORY_NAME_BY_ID: Record<number, string> = {
  1: 'Camisas',
  2: 'Jeans',
  3: 'Camisas',
  4: 'Camperas',
  5: 'Buzos',
  6: 'Vestidos',
  7: 'Faldas',
  8: 'Short',
  9: 'Zapatillas',
  10: 'Gorras',
  11: 'Mochilas',
  12: 'Brasieres',
  13: 'Boxers',
  14: 'Cinturones',
  15: 'Carteras',
  16: 'Gorras',
  17: 'Lentes',
  18: 'Botas',
  19: 'Zapatillas',
  20: 'Sandalias',
  21: 'Mocasines',
};

const CATEGORY_ID_BY_NAME: Record<string, number> = {
  Camisas: 1,
  Jeans: 2,
  Pantalones: 2,
  Camperas: 4,
  Buzos: 5,
  Faldas: 7,
  Short: 8,
  Shorts: 8,
  Gorras: 10,
  Mochilas: 11,
  Brasieres: 12,
  Boxers: 13,
  Cinturones: 14,
  Carteras: 15,
  Lentes: 17,
  Botas: 18,
  Zapatillas: 19,
  Sandalias: 20,
  Mocasines: 21,
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
  categorias?: { nombre: string }[] | null;
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
  tipo_prenda: string;
  temporada: CategoriaProducto['temporada'];
  publico: CategoriaProducto['publico'];
  creado_por: string;
}

export interface ProductoInput {
  nombre: string;
  precio: number;
  stock: number;
  imagen: string;
  categoria: string;
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
    throw new Error(
      'Supabase no esta configurado. Revisa EXPO_PUBLIC_SUPABASE_URL y EXPO_PUBLIC_SUPABASE_ANON_KEY.'
    );
  }

  return supabase;
}

function formatSupabaseError(error: { code?: string; message?: string; details?: string; hint?: string }) {
  const parts = [error.code, error.message, error.details, error.hint].filter(Boolean);
  return parts.join(' | ') || 'No se pudo crear el producto.';
}

/*
 * Convierte el tipo de prenda que usamos en la app
 * al nombre de categoria que existe en la base de datos.
 */
function legacyCategoryName(
  tipoPrenda: CategoriaProducto['tipoPrenda']
) {
  const names: Record<string, string> = {
      Camisa: 'Camisas',
      Remera: 'Camisas',
      Pantalón: 'Jeans',
      Campera: 'Camperas',
      Buzo: 'Buzos',
      Vestido: 'Vestidos',
      Falda: 'Faldas',
      Short: 'Short',
      Calzado: 'Botas',
      Accesorio: 'Accesorios',
      Torso: 'Camisas',
      Interior: 'Interior',
      Equipamiento: 'Equipamiento',
  };

  return names[tipoPrenda] ?? tipoPrenda;
  }

  function normalizeTipoPrenda(tipoPrenda: string): CategoriaProducto['tipoPrenda'] {
    const types: Record<string, CategoriaProducto['tipoPrenda']> = {
      Camisa: 'Torso',
      Remera: 'Torso',
      Campera: 'Torso',
      Buzo: 'Torso',
      Pantalón: 'Pantalón',
      Torso: 'Torso',
      Vestido: 'Vestido',
      Falda: 'Falda',
      Short: 'Short',
      Calzado: 'Calzado',
      Accesorio: 'Accesorio',
      Interior: 'Interior',
      Equipamiento: 'Equipamiento',
    };

    return types[tipoPrenda] ?? 'Torso';
}

/*
 * Busca la categoria por nombre directamente en Supabase.
 *
 * Esto evita asumir que:
 * Camisas = 1
 * Jeans = 2
 * etc.
 *
 * Como categoriaid es identity, los IDs pueden cambiar
 * dependiendo del contenido de la base de datos.
 */
async function obtenerCategoriaId(
  nombreCategoria: string
) {
  const client = assertSupabaseConfigured();

  const categoriaIdConocida = CATEGORY_ID_BY_NAME[nombreCategoria];
  if (categoriaIdConocida) {
    return categoriaIdConocida;
  }

  const { data, error } = await client
    .from('categorias')
    .select('categoriaid, nombre')
    .eq('nombre', nombreCategoria)
    .maybeSingle();

  if (error) {
    throw new Error(`No se pudo consultar la categoría: ${formatSupabaseError(error)}`);
  }

  if (data) {
    return data.categoriaid;
  }

  /*
   * Si la categoria todavía no existe,
   * la creamos.
   */
  const { data: nuevaCategoria, error: errorInsert } = await client
    .from('categorias')
    .insert({
      nombre: nombreCategoria,
    })
    .select('categoriaid')
    .single();

  if (errorInsert) {
    throw errorInsert;
  }

  return nuevaCategoria.categoriaid;
}

function tipoPrendaPersistido(categoria: string, tipoPrenda: CategoriaProducto['tipoPrenda']) {
  const tiposPorCategoria: Record<string, string> = {
    Camisas: 'Camisa',
    Camperas: 'Campera',
    Buzos: 'Buzo',
    Faldas: 'Falda',
    Pantalones: 'Pantalón',
    Jeans: 'Pantalón',
    Short: 'Short',
    Brasieres: 'Accesorio',
    Boxers: 'Accesorio',
    Cinturones: 'Accesorio',
    Carteras: 'Accesorio',
    Gorras: 'Accesorio',
    Lentes: 'Accesorio',
    Mochilas: 'Accesorio',
    Botas: 'Calzado',
    Zapatillas: 'Calzado',
    Sandalias: 'Calzado',
    Mocasines: 'Calzado',
  };

  return tiposPorCategoria[categoria] ?? tipoPrenda;
}

/*
 * Convierte una fila de Supabase al formato Producto
 * que utiliza la aplicación.
 */
function mapRowToProducto(row: ProductoRow): Producto {
  const imagenes = (row.imagenes ?? []).filter(Boolean);

  const imagenPrincipal =
    imagenes[0] ||
    row.imagen_url ||
    IMAGE_FALLBACK;

  const categoriaProducto =
    row.tipo_prenda &&
    row.temporada &&
    row.publico
      ? {
          tipoPrenda: normalizeTipoPrenda(row.tipo_prenda),
          temporada: row.temporada,
          publico: row.publico,
        }
      : undefined;

  return {
    id: row.productoid.toString(),
    nombre: row.nombre,
    precio: Number(row.precio),
    imagen: imagenPrincipal,
    imagenes,
    categoria: CATEGORY_NAME_BY_ID[row.categoriaid ?? 0] || row.categorias?.[0]?.nombre || (row.tipo_prenda
      ? legacyCategoryName(row.tipo_prenda)
      : 'Camisas'),
    categoriaId: row.categoriaid ?? undefined,
    categoriaProducto,

    /*
     * El producto está disponible solamente
     * si tiene stock mayor a 0.
     */
    disponible: (row.stock ?? 0) > 0,

    /*
     * Ahora sí devolvemos el stock real.
     */
    stock: row.stock ?? 0,

    talle: row.talles ?? [],
    colores: row.colores ?? [],
    descripcion: row.descripcion,
  };
}

/*
 * Convierte los datos del formulario al formato
 * que espera la tabla productos.
 */
async function mapInputToPersistData(
  payload: ProductoInput
): Promise<ProductoPersistData> {
  const categoriaProducto: CategoriaProducto = {
    tipoPrenda: payload.tipoPrenda,
    temporada: payload.temporada,
    publico: payload.publico,
  };

  const categoriaid = await obtenerCategoriaId(payload.categoria);

  /*
   * Si disponible es false, guardamos stock 0.
   * Si es true, usamos el stock indicado por el usuario.
   */
  const stock = payload.disponible
    ? Math.max(0, payload.stock)
    : 0;

  const imagen = payload.imagen.trim();
  const { data: authData, error: authError } = await supabase.auth.getUser();

  if (authError || !authData.user) {
    throw new Error('Debes iniciar sesion para publicar un producto.');
  }

  return {
    nombre: payload.nombre.trim(),
    descripcion: payload.descripcion.trim(),
    precio: payload.precio,
    stock,
    categoriaid,
    imagen_url: imagen,
    imagenes: imagen ? [imagen] : [],
    talles: payload.talle,
    colores: payload.colores,
    tipo_prenda: tipoPrendaPersistido(payload.categoria, categoriaProducto.tipoPrenda),
    temporada: categoriaProducto.temporada,
    publico: categoriaProducto.publico,
    creado_por: authData.user.id,
  };
}

/*
 * Obtener todos los productos.
 */
export async function getProductos() {
  const client = assertSupabaseConfigured();

  const { data, error } = await client
    .from(TABLA_PRODUCTOS)
    .select(
      `
        productoid,
        nombre,
        descripcion,
        precio,
        stock,
        categoriaid,
        imagen_url,
        imagenes,
        talles,
        colores,
        tipo_prenda,
        temporada,
        publico
        ,categorias ( nombre )
      `
    )
    .order('productoid', {
      ascending: false,
    });

  if (error) {
    throw error;
  }

  return (data ?? []).map((row) =>
    mapRowToProducto(row as ProductoRow)
  );
}

/*
 * Obtener un producto por ID.
 */
export async function getProductoById(id: string) {
  const client = assertSupabaseConfigured();

  const productoid = Number(id);

  if (!Number.isFinite(productoid)) {
    return null;
  }

  const { data, error } = await client
    .from(TABLA_PRODUCTOS)
    .select(
      `
        productoid,
        nombre,
        descripcion,
        precio,
        stock,
        categoriaid,
        imagen_url,
        imagenes,
        talles,
        colores,
        tipo_prenda,
        temporada,
        publico
        ,categorias ( nombre )
      `
    )
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

/*
 * Crear producto.
 */
export async function createProducto(
  payload: ProductoInput
) {
  const client = assertSupabaseConfigured();

  const dataToInsert =
    await mapInputToPersistData(payload);

  const { data, error } = await client
    .from(TABLA_PRODUCTOS)
    .insert(dataToInsert)
    .select(
      `
        productoid,
        nombre,
        descripcion,
        precio,
        stock,
        categoriaid,
        imagen_url,
        imagenes,
        talles,
        colores,
        tipo_prenda,
        temporada,
        publico
        ,categorias ( nombre )
      `
    )
    .single();

  if (error) {
    throw new Error(`No se pudo crear el producto: ${formatSupabaseError(error)}`);
  }

  return mapRowToProducto(data as ProductoRow);
}

/*
 * Actualizar producto.
 */
export async function updateProducto(
  id: string,
  payload: ProductoInput
) {
  const client = assertSupabaseConfigured();

  const productoid = Number(id);

  if (!Number.isFinite(productoid)) {
    throw new Error('ID de producto invalido.');
  }

  const dataToUpdate =
    await mapInputToPersistData(payload);

  const { data, error } = await client
    .from(TABLA_PRODUCTOS)
    .update(dataToUpdate)
    .eq('productoid', productoid)
    .select(
      `
        productoid,
        nombre,
        descripcion,
        precio,
        stock,
        categoriaid,
        imagen_url,
        imagenes,
        talles,
        colores,
        tipo_prenda,
        temporada,
        publico
        ,categorias ( nombre )
      `
    )
    .single();

  if (error) {
    throw error;
  }

  return mapRowToProducto(data as ProductoRow);
}

/*
 * Eliminar producto.
 */
export async function deleteProducto(id: string) {
  const client = assertSupabaseConfigured();

  const productoid = Number(id);

  if (!Number.isFinite(productoid)) {
    throw new Error('ID de producto invalido.');
  }

  const { error } = await client
    .from(TABLA_PRODUCTOS)
    .delete()
    .eq('productoid', productoid);

  if (error) {
    throw error;
  }
}

/*
 * Escuchar cambios en tiempo real de productos.
 */
export function subscribeToProductos(
  onChange: () => void
) {
  const client = assertSupabaseConfigured();

  const channel = client
    .channel('productos-realtime')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: TABLA_PRODUCTOS,
      },
      () => {
        onChange();
      }
    )
    .subscribe();

  return () => {
    client.removeChannel(channel);
  };
}