import AsyncStorage from '@react-native-async-storage/async-storage';

const BIENVENIDA_KEY = 'ny_bienvenida_vista';

/** Indica si el usuario ya pasó por la tarjeta de bienvenida en este dispositivo. */
export async function bienvenidaVista() {
  try {
    return (await AsyncStorage.getItem(BIENVENIDA_KEY)) === '1';
  } catch {
    return false;
  }
}

export async function marcarBienvenidaVista() {
  try {
    await AsyncStorage.setItem(BIENVENIDA_KEY, '1');
  } catch {
    // Si falla el guardado, la tarjeta vuelve a mostrarse en el próximo inicio.
  }
}
