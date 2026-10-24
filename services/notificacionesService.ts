import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import type * as ModuloNotificaciones from 'expo-notifications';
import { Platform } from 'react-native';

const CANAL_ANDROID = 'publicaciones';
const CLAVE_RECORDATORIOS = 'ny_recordatorios';
// El recordatorio llega al día siguiente de publicar.
const SEGUNDOS_RECORDATORIO = 24 * 60 * 60;

/**
 * expo-notifications se carga recién acá y sólo si existe su módulo nativo:
 * Expo Go (SDK 53+) ya no lo trae y un import directo rompe la app al abrirla.
 * En la web tampoco hay notificaciones. En esos casos queda en null.
 */
function cargarNotificaciones(): typeof ModuloNotificaciones | null {
  if (Platform.OS === 'web' || Constants.executionEnvironment === ExecutionEnvironment.StoreClient) {
    return null;
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- carga condicional
    return require('expo-notifications') as typeof ModuloNotificaciones;
  } catch {
    return null;
  }
}

export const Notifications = cargarNotificaciones();
export const notificacionesDisponibles = Notifications !== null;

// A nivel módulo: decide cómo se muestra una notificación con la app abierta.
if (Notifications) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
}

/** Pide el permiso; sin el módulo nativo (Expo Go, web) responde denegado sin preguntar. */
export async function pedirPermisoNotificaciones() {
  if (!Notifications) {
    return { status: 'denied', canAskAgain: false };
  }
  return Notifications.requestPermissionsAsync();
}

/** Android 8+ no muestra nada sin un canal creado. */
export async function asegurarCanalAndroid() {
  if (Platform.OS !== 'android' || !Notifications) {
    return;
  }
  await Notifications.setNotificationChannelAsync(CANAL_ANDROID, {
    name: 'Publicaciones y pedidos',
    importance: Notifications.AndroidImportance.DEFAULT,
  });
}

async function leerRecordatorios(): Promise<Record<string, string>> {
  const crudo = await AsyncStorage.getItem(CLAVE_RECORDATORIOS);
  return crudo ? (JSON.parse(crudo) as Record<string, string>) : {};
}

async function guardarRecordatorios(recordatorios: Record<string, string>) {
  await AsyncStorage.setItem(CLAVE_RECORDATORIOS, JSON.stringify(recordatorios));
}

/**
 * Programa una notificación local para el día siguiente a publicar una prenda.
 * Se guarda su id para cancelarla si la prenda se borra antes.
 */
export async function programarRecordatorioPublicacion(producto: { id: string; nombre: string }) {
  if (!Notifications) {
    return null;
  }

  await asegurarCanalAndroid();
  const notificacionId = await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Tu prenda sigue publicada',
      body: `Compartí "${producto.nombre}" para venderla más rápido.`,
      data: { productoId: producto.id },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: SEGUNDOS_RECORDATORIO,
      channelId: CANAL_ANDROID,
    },
  });

  const recordatorios = await leerRecordatorios();
  recordatorios[producto.id] = notificacionId;
  await guardarRecordatorios(recordatorios);
  return notificacionId;
}

/** Cancela el recordatorio de una prenda borrada (si tenía uno). */
export async function cancelarRecordatorioPublicacion(productoId: string) {
  if (!Notifications) {
    return;
  }

  const recordatorios = await leerRecordatorios();
  const notificacionId = recordatorios[productoId];
  if (!notificacionId) {
    return;
  }

  await Notifications.cancelScheduledNotificationAsync(notificacionId);
  delete recordatorios[productoId];
  await guardarRecordatorios(recordatorios);
}
