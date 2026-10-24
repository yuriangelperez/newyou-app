import { useCallback, useState } from 'react';
import { Alert, Linking, Platform } from 'react-native';
import Toast from 'react-native-toast-message';

export type PermissionStatus = 'undetermined' | 'granted' | 'denied';

interface RespuestaPermiso {
  status: string;
  canAskAgain?: boolean;
}

interface UsePermissionResult {
  status: PermissionStatus;
  /** Pide el permiso; devuelve true si quedó concedido. */
  request: () => Promise<boolean>;
  goToSettings: () => void;
}

/**
 * Hook genérico de permisos (cámara, galería, ubicación). Se llama recién cuando
 * el usuario toca el botón que lo necesita, nunca al abrir la app.
 * Si se deniega, avisa con `mensajeDenegado`; si el sistema ya no deja volver a
 * preguntar (`canAskAgain === false`), ofrece abrir los Ajustes del dispositivo.
 */
export function usePermission(
  requestFn: () => Promise<RespuestaPermiso>,
  mensajeDenegado: string,
): UsePermissionResult {
  const [status, setStatus] = useState<PermissionStatus>('undetermined');

  const goToSettings = useCallback(() => {
    void Linking.openSettings();
  }, []);

  const request = useCallback(async () => {
    const resultado = await requestFn();

    if (resultado.status === 'granted') {
      setStatus('granted');
      return true;
    }

    setStatus('denied');

    // En la web no hay Ajustes a los que mandar: el permiso se cambia desde el navegador.
    if (resultado.canAskAgain === false && Platform.OS !== 'web') {
      Alert.alert(
        'Permiso requerido',
        `${mensajeDenegado} Habilitalo desde la configuración del dispositivo.`,
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Ir a Ajustes', onPress: goToSettings },
        ],
      );
    } else {
      Toast.show({ type: 'info', text1: 'Permiso denegado', text2: mensajeDenegado });
    }

    return false;
  }, [requestFn, mensajeDenegado, goToSettings]);

  return { status, request, goToSettings };
}
