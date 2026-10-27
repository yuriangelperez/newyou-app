import { useEffect, useState } from 'react';

import { Categoria, CATEGORIAS_BASE } from '../constants/categoriasProductos';
import { listarCategorias } from '../services/categoriasService';

/** Categorías de Supabase (con las de la app mientras cargan o si falla la consulta). */
export function useCategorias() {
  const [categorias, setCategorias] = useState<Categoria[]>(CATEGORIAS_BASE);

  useEffect(() => {
    let activo = true;
    void listarCategorias().then((lista) => {
      if (activo) setCategorias(lista);
    });
    return () => {
      activo = false;
    };
  }, []);

  return categorias;
}
