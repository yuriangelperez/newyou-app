import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';

import { getProductoById, subscribeToProductos } from '../services/productosService';
import { Producto } from '../types';

interface UseProductoByIdResult {
  producto: Producto | null;
  cargando: boolean;
  error: string | null;
  refrescar: () => Promise<void>;
}

interface Resultado {
  /** Id al que corresponde este resultado; mientras no coincida con el pedido, se está cargando. */
  id: string;
  producto: Producto | null;
  error: string | null;
}

export function useProductoById(id?: string): UseProductoByIdResult {
  const [resultado, setResultado] = useState<Resultado | null>(null);

  const cargar = useCallback(async () => {
    if (!id) {
      return;
    }

    await getProductoById(id).then(
      (data) => setResultado({ id, producto: data, error: null }),
      (err: unknown) => {
        const message = err instanceof Error ? err.message : 'No se pudo cargar el producto.';
        // Si falla una recarga se conserva el producto que ya se mostraba.
        setResultado((previo) => ({ id, producto: previo?.id === id ? previo.producto : null, error: message }));
      },
    );
  }, [id]);

  // El estado se actualiza cuando llega la respuesta; "cargando" se deriva del id pedido.
  useEffect(() => {
    void cargar();
  }, [cargar]);

  // Recarga al volver a la pantalla para reflejar cambios de stock o precio.
  const primerFoco = useRef(true);
  useFocusEffect(
    useCallback(() => {
      if (primerFoco.current) {
        primerFoco.current = false;
        return;
      }

      void cargar();
    }, [cargar]),
  );

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

  if (!id) {
    return { producto: null, cargando: false, error: 'Producto invalido.', refrescar: cargar };
  }

  const vigente = resultado?.id === id ? resultado : null;

  return {
    producto: vigente?.producto ?? null,
    cargando: !vigente,
    error: vigente?.error ?? null,
    refrescar: cargar,
  };
}
