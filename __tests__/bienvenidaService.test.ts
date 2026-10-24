import AsyncStorage from '@react-native-async-storage/async-storage';

import { bienvenidaVista, marcarBienvenidaVista } from '../services/bienvenidaService';

describe('bienvenidaService', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('en el primer inicio la bienvenida no fue vista', async () => {
    await expect(bienvenidaVista()).resolves.toBe(false);
  });

  it('recuerda que la bienvenida ya se mostró', async () => {
    await marcarBienvenidaVista();

    expect(AsyncStorage.setItem).toHaveBeenCalledWith('ny_bienvenida_vista', '1');
    await expect(bienvenidaVista()).resolves.toBe(true);
  });
});
