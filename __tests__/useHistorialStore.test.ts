import AsyncStorage from '@react-native-async-storage/async-storage';

import { agregarAlFrente, MAX_VISTOS, useHistorialStore } from '../stores/useHistorialStore';

describe('historial del dispositivo', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    useHistorialStore.setState({ vistos: [], busquedas: [], cargado: false });
  });

  it('pone lo último primero sin repetir y respeta el máximo', () => {
    expect(agregarAlFrente(['a', 'b', 'c'], 'b', 3)).toEqual(['b', 'a', 'c']);
    const muchos = Array.from({ length: MAX_VISTOS }, (_, i) => `p${i}`);
    expect(agregarAlFrente(muchos, 'nuevo', MAX_VISTOS)).toHaveLength(MAX_VISTOS);
  });

  it('guarda búsquedas sin duplicar mayúsculas e ignora textos cortos', async () => {
    const { registrarBusqueda } = useHistorialStore.getState();
    registrarBusqueda('Campera');
    registrarBusqueda('campera');
    registrarBusqueda('a');
    registrarBusqueda(' a ');
    registrarBusqueda('a.');
    expect(useHistorialStore.getState().busquedas).toEqual(['campera']);

    // Al reabrir la app se recupera lo guardado.
    useHistorialStore.setState({ busquedas: [], cargado: false });
    await useHistorialStore.getState().cargar();
    expect(useHistorialStore.getState().busquedas).toEqual(['campera']);
  });

  it('registra prendas vistas y borra búsquedas', () => {
    const estado = useHistorialStore.getState();
    estado.registrarVisto('1');
    estado.registrarVisto('2');
    estado.registrarVisto('1');
    expect(useHistorialStore.getState().vistos).toEqual(['1', '2']);

    estado.registrarBusqueda('jean');
    useHistorialStore.getState().borrarBusquedas();
    expect(useHistorialStore.getState().busquedas).toEqual([]);
  });
});
