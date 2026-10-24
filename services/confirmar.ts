import { Alert, Platform } from 'react-native';

/**
 * Pide confirmación antes de una acción destructiva. En la web Alert.alert no hace
 * nada (react-native-web), así que se usa window.confirm.
 */
export function confirmar(titulo: string, mensaje: string, textoAccion = 'Aceptar'): Promise<boolean> {
  if (Platform.OS === 'web') {
    return Promise.resolve(window.confirm(`${titulo}\n\n${mensaje}`));
  }

  return new Promise((resolve) => {
    Alert.alert(titulo, mensaje, [
      { text: 'Cancelar', style: 'cancel', onPress: () => resolve(false) },
      { text: textoAccion, style: 'destructive', onPress: () => resolve(true) },
    ]);
  });
}
