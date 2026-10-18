import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';

import { getProductos, subscribeToProductos } from '../services/productosService';
import { Producto } from '../types';

interface UseProductosResult {
  productos: Producto[];
  cargando: boolean;
  refreshing: boolean;
  error: string | null;
  refrescar: () => Promise<void>;
}

export function useProductos(): UseProductosResult {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [cargando, setCargando] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async (mode: 'loading' | 'refresh' | 'silent' = 'loading') => {
    if (mode === 'loading') {
      setCargando(true);
    }

    if (mode === 'refresh') {
      setRefreshing(true);
    }

    try {
      setError(null);
      const data = await getProductos();
      setProductos(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'No se pudo cargar el catalogo.';
      setError(message);
    } finally {
      if (mode === 'loading') {
        setCargando(false);
      }

      if (mode === 'refresh') {
        setRefreshing(false);
      }
    }
  }, []);

  useEffect(() => {
    void cargar('loading');
  }, [cargar]);

  // Al volver a la pantalla (p. ej. tras editar stock en "Mis publicaciones")
  // se recarga el catálogo sin spinner. La primera carga ya la hace el efecto de arriba.
  const primerFoco = useRef(true);
  useFocusEffect(
    useCallback(() => {
      if (primerFoco.current) {
        primerFoco.current = false;
        return;
      }

      void cargar('silent');
    }, [cargar]),
  );

  useEffect(() => {
    let unsubscribe = () => {};

    try {
      unsubscribe = subscribeToProductos(() => {
        void cargar('silent');
      });
    } catch {
      unsubscribe = () => {};
    }

    return () => {
      unsubscribe();
    };
  }, [cargar]);

  return {
    productos,
    cargando,
    refreshing,
    error,
    refrescar: () => cargar('refresh'),
  };
}