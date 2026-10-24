import { useCallback } from 'react';

import {
  notificacionesDisponibles,
  pedirPermisoNotificaciones,
  programarRecordatorioPublicacion,
} from '../services/notificacionesService';
import { usePermission } from './usePermission';

/**
 * Notificaciones locales de la app. El permiso se pide recién cuando el usuario
 * publica una prenda (no al abrir la app), con el hook genérico de permisos.
 */
export function useNotifications() {
  const permiso = usePermission(
    pedirPermisoNotificaciones,
    'Sin permiso de notificaciones no vas a recibir recordatorios de tus publicaciones.',
  );

  /** Pide el permiso y programa el recordatorio. Nunca lanza: publicar no depende de esto. */
  const recordarPublicacion = useCallback(
    async (producto: { id: string; nombre: string }) => {
      if (!notificacionesDisponibles) {
        return;
      }
      try {
        if (await permiso.request()) {
          await programarRecordatorioPublicacion(producto);
        }
      } catch {
        // Sin recordatorio la publicación igual quedó creada.
      }
    },
    [permiso],
  );

  return { recordarPublicacion, status: permiso.status };
}
