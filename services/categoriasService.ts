import {
  Categoria,
  CATEGORIAS_BASE,
  GRUPOS_CATEGORIA,
  GrupoCategoria,
} from '../constants/categoriasProductos';
import { normalizarTexto } from '../utils/texto';
import { supabase } from './supabase';

interface CategoriaRow {
  categoriaid: number;
  nombre: string;
  grupo: string | null;
  imagen_url: string | null;
}

const imagenBase = (nombre: string) =>
  CATEGORIAS_BASE.find((item) => normalizarTexto(item.nombre) === normalizarTexto(nombre))?.imagen;

/**
 * Categorías visibles: las de la tabla `categorias` que tienen grupo (migración 16).
 * Si la tabla todavía no tiene la columna o falla la consulta, se usan las de la app.
 */
export async function listarCategorias(): Promise<Categoria[]> {
  try {
    const { data, error } = await supabase
      .from('categorias')
      .select('categoriaid, nombre, grupo, imagen_url')
      .not('grupo', 'is', null)
      .order('orden', { ascending: true })
      .order('nombre', { ascending: true });

    if (error || !data || data.length === 0) {
      return CATEGORIAS_BASE;
    }

    const vistas = new Set<string>();
    return (data as CategoriaRow[])
      .filter((row) => (GRUPOS_CATEGORIA as readonly string[]).includes(row.grupo ?? ''))
      .filter((row) => {
        const clave = normalizarTexto(row.nombre);
        if (vistas.has(clave)) return false;
        vistas.add(clave);
        return true;
      })
      .map((row) => ({
        id: row.categoriaid,
        nombre: row.nombre,
        grupo: row.grupo as GrupoCategoria,
        imagen: row.imagen_url || imagenBase(row.nombre),
      }));
  } catch {
    return CATEGORIAS_BASE;
  }
}
