import * as Notifications from 'expo-notifications';
import { useCallback, useEffect, useState } from 'react';
import Toast from 'react-native-toast-message';

import {
  desregistrarDispositivoPush,
  obtenerTokenPushGuardado,
  registrarDispositivoPush,
} from '../services/pushService';
import { usePermission } from './usePermission';

/** Interruptor "Notificaciones push" de Ajustes: registra o quita este dispositivo. */
export function usePushNotifications() {
  const [activas, setActivas] = useState(false);
  const [cargando, setCargando] = useState(true);
  const permiso = usePermission(
    Notifications.requestPermissionsAsync,
    'Sin permiso de notificaciones no vas a recibir avisos de tus pedidos.',
  );

  useEffect(() => {
    obtenerTokenPushGuardado()
      .then((token) => setActivas(Boolean(token)))
      .catch(() => setActivas(false))
      .finally(() => setCargando(false));
  }, []);

  const cambiar = useCallback(
    async (valor: boolean) => {
      setCargando(true);
      try {
        if (!valor) {
          await desregistrarDispositivoPush();
          setActivas(false);
        } else if (await permiso.request()) {
          await registrarDispositivoPush();
          setActivas(true);
        }
      } catch (error) {
        Toast.show({
          type: 'error',
          text1: 'No se pudieron activar las notificaciones',
          text2: error instanceof Error ? error.message : undefined,
        });
      } finally {
        setCargando(false);
      }
    },
    [permiso],
  );

  return { activas, cargando, cambiar };
}
