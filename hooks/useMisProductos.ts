import { useCallback, useEffect, useState } from 'react';
import { Producto } from '../types';
import { getMisProductos, getProductosDeEmpresa } from '../services/productosService';

/** Publicaciones propias, o las de la empresa activa si se pasa su id. */
export function useMisProductos(empresaId: number | null = null) {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [cargando, setCargando] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    try {
      setError(null);

      const data = empresaId ? await getProductosDeEmpresa(empresaId) : await getMisProductos();

      setProductos(data);
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : 'No se pudieron cargar tus publicaciones.';

      setError(message);
    }
  }, [empresaId]);

  useEffect(() => {
    void cargar().finally(() => {
      setCargando(false);
    });
  }, [cargar]);

  const refrescar = useCallback(async () => {
    try {
      setRefreshing(true);
      await cargar();
    } finally {
      setRefreshing(false);
    }
  }, [cargar]);

  return {
    productos,
    cargando,
    refreshing,
    error,
    refrescar,
  };
}