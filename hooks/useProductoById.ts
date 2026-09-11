import { useCallback, useEffect, useState } from 'react';

import { getProductoById, subscribeToProductos } from '../services/productosService';
import { Producto } from '../types';

interface UseProductoByIdResult {
  producto: Producto | null;
  cargando: boolean;
  error: string | null;
  refrescar: () => Promise<void>;
}

export function useProductoById(id?: string): UseProductoByIdResult {
  const [producto, setProducto] = useState<Producto | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    if (!id) {
      setProducto(null);
      setError('Producto invalido.');
      setCargando(false);
      return;
    }

    try {
      setError(null);
      const data = await getProductoById(id);
      setProducto(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'No se pudo cargar el producto.';
      setError(message);
    } finally {
      setCargando(false);
    }
  }, [id]);

  useEffect(() => {
    setCargando(true);
    void cargar();
  }, [cargar]);

  useEffect(() => {
    if (!id) {
      return;
    }

    let unsubscribe = () => {};

    try {
      unsubscribe = subscribeToProductos(() => {
        void cargar();
      });
    } catch {
      unsubscribe = () => {};
    }

    return () => {
      unsubscribe();
    };
  }, [cargar, id]);

  return {
    producto,
    cargando,
    error,
    refrescar: cargar,
  };
}
