import { useCallback, useEffect, useState } from 'react';
import { Producto } from '../types';
import { getMisProductos, getProductosDeEmpresa } from '../services/productosService';

const MENSAJE_ERROR = 'No se pudieron cargar tus publicaciones.';

function pedirProductos(empresaId: number | null) {
  return empresaId ? getProductosDeEmpresa(empresaId, true) : getMisProductos();
}

/** Publicaciones propias, o las de la empresa activa si se pasa su id. */
export function useMisProductos(empresaId: number | null = null) {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [cargando, setCargando] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const aplicar = useCallback((pedido: Promise<Producto[]>) => {
    return pedido.then(
      (data) => {
        setError(null);
        setProductos(data);
      },
      (err: unknown) => {
        setError(err instanceof Error ? err.message : MENSAJE_ERROR);
      },
    );
  }, []);

  // El setState ocurre cuando llega la respuesta, no de forma síncrona en el efecto.
  useEffect(() => {
    void aplicar(pedirProductos(empresaId)).finally(() => setCargando(false));
  }, [aplicar, empresaId]);

  const refrescar = useCallback(async () => {
    try {
      setRefreshing(true);
      await aplicar(pedirProductos(empresaId));
    } finally {
      setRefreshing(false);
    }
  }, [aplicar, empresaId]);

  return {
    productos,
    cargando,
    refreshing,
    error,
    refrescar,
  };
}
