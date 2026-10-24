import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { asegurarCanalAndroid, notificacionesDisponibles } from './notificacionesService';
import { supabase } from './supabase';

const CLAVE_TOKEN_PUSH = 'ny_push_token';

/** Token de este dispositivo si ya se registró para recibir push (null si no). */
export const obtenerTokenPushGuardado = () => AsyncStorage.getItem(CLAVE_TOKEN_PUSH);

/**
 * Registra el dispositivo para notificaciones push de pedidos (Clase 10).
 * El permiso ya tiene que estar concedido. Sólo funciona en un build de EAS en
 * un celular real: en Expo Go y en simuladores no hay token push.
 */
export async function registrarDispositivoPush(): Promise<string> {
  if (!notificacionesDisponibles || !Device.isDevice) {
    throw new Error('Las notificaciones push sólo funcionan en un celular real.');
  }

  const projectId = Constants.expoConfig?.extra?.eas?.projectId as string | undefined;
  if (!projectId) {
    throw new Error('Falta el projectId de EAS en app.json.');
  }

  await asegurarCanalAndroid();
  const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });

  // Por RPC: si el celular lo usaba otra cuenta, el token pasa a la actual.
  const { error } = await supabase.rpc('registrar_push_token', {
    p_token: token,
    p_plataforma: Platform.OS,
  });
  if (error) {
    throw error;
  }

  await AsyncStorage.setItem(CLAVE_TOKEN_PUSH, token);
  return token;
}

/** Deja de recibir push en este dispositivo (desde Ajustes o al cerrar sesión). */
export async function desregistrarDispositivoPush() {
  const token = await obtenerTokenPushGuardado();
  if (!token) {
    return;
  }

  await supabase.from('push_tokens').delete().eq('token', token);
  await AsyncStorage.removeItem(CLAVE_TOKEN_PUSH);
}
