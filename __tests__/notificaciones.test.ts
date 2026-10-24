import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';

import {
  cancelarRecordatorioPublicacion,
  programarRecordatorioPublicacion,
} from '../services/notificacionesService';

jest.mock('expo-notifications', () => ({
  setNotificationHandler: jest.fn(),
  setNotificationChannelAsync: jest.fn(async () => null),
  scheduleNotificationAsync: jest.fn(async () => 'notif-1'),
  cancelScheduledNotificationAsync: jest.fn(async () => undefined),
  AndroidImportance: { DEFAULT: 3 },
  SchedulableTriggerInputTypes: { TIME_INTERVAL: 'timeInterval' },
}));

beforeEach(async () => {
  jest.clearAllMocks();
  await AsyncStorage.clear();
});

describe('recordatorio de publicación', () => {
  it('programa la notificación al día siguiente', async () => {
    await programarRecordatorioPublicacion({ id: '7', nombre: 'Campera' });

    expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        content: expect.objectContaining({ data: { productoId: '7' } }),
        trigger: expect.objectContaining({ type: 'timeInterval', seconds: 86400 }),
      }),
    );
  });

  it('la cancela cuando se borra la prenda', async () => {
    await programarRecordatorioPublicacion({ id: '7', nombre: 'Campera' });
    await cancelarRecordatorioPublicacion('7');

    expect(Notifications.cancelScheduledNotificationAsync).toHaveBeenCalledWith('notif-1');
  });

  it('no hace nada si la prenda no tenía recordatorio', async () => {
    await cancelarRecordatorioPublicacion('99');

    expect(Notifications.cancelScheduledNotificationAsync).not.toHaveBeenCalled();
  });
});
