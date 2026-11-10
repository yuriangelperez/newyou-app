import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';

import { contarAvisosSinLeer, escucharAvisos } from '../services/avisosService';
import { useUsuarioStore } from '../stores/useUsuarioStore';

/** Cantidad de notificaciones sin leer; se actualiza al volver a la pantalla y en tiempo real. */
export function useAvisosSinLeer() {
  const usuarioId = useUsuarioStore((state) => state.usuario?.id ?? '');
  const [sinLeer, setSinLeer] = useState(0);

  const recargar = useCallback(() => {
    if (!usuarioId) return;
    contarAvisosSinLeer()
      .then(setSinLeer)
      .catch(() => undefined);
  }, [usuarioId]);

  useFocusEffect(recargar);

  useEffect(() => {
    if (!usuarioId) return;
    return escucharAvisos(usuarioId, recargar);
  }, [usuarioId, recargar]);

  return usuarioId ? sinLeer : 0;
}
