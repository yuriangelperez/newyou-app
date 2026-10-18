import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

import { Direccion, listarDirecciones } from '../services/direccionesService';

export function useDirecciones() {
  const [direcciones, setDirecciones] = useState<Direccion[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const recargar = useCallback(async () => {
    try {
      setError(null);
      setDirecciones(await listarDirecciones());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudieron cargar tus direcciones.');
    } finally {
      setCargando(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void recargar();
    }, [recargar]),
  );

  return { direcciones, cargando, error, recargar };
}
