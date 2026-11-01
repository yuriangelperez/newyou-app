import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';

// Historial local del dispositivo: prendas vistas y búsquedas recientes.
// Se guardan sólo los ids/textos; las prendas se buscan en el catálogo cargado,
// así nunca se muestra un precio o stock viejo.
const CLAVE_VISTOS = 'ny_vistos_recientes';
const CLAVE_BUSQUEDAS = 'ny_busquedas_recientes';
export const MAX_VISTOS = 10;
export const MAX_BUSQUEDAS = 6;

interface HistorialStore {
  vistos: string[];
  busquedas: string[];
  cargado: boolean;
  cargar: () => Promise<void>;
  registrarVisto: (productoId: string) => void;
  registrarBusqueda: (texto: string) => void;
  borrarBusquedas: () => void;
}

function guardar(clave: string, valor: string[]) {
  AsyncStorage.setItem(clave, JSON.stringify(valor)).catch(() => {
    // Si no se puede guardar, el historial vale sólo para esta sesión.
  });
}

function leerLista(texto: string | null): string[] {
  try {
    const lista = texto ? JSON.parse(texto) : [];
    return Array.isArray(lista) ? lista.filter((item) => typeof item === 'string') : [];
  } catch {
    return [];
  }
}

/** Pone el valor primero, sin repetirlo, y corta la lista al máximo. */
export function agregarAlFrente(lista: string[], valor: string, maximo: number, mismo = (a: string, b: string) => a === b) {
  return [valor, ...lista.filter((item) => !mismo(item, valor))].slice(0, maximo);
}

export const useHistorialStore = create<HistorialStore>((set, get) => ({
  vistos: [],
  busquedas: [],
  cargado: false,

  cargar: async () => {
    if (get().cargado) return;
    try {
      const [vistos, busquedas] = await Promise.all([
        AsyncStorage.getItem(CLAVE_VISTOS),
        AsyncStorage.getItem(CLAVE_BUSQUEDAS),
      ]);
      set({ vistos: leerLista(vistos), busquedas: leerLista(busquedas), cargado: true });
    } catch {
      set({ cargado: true });
    }
  },

  registrarVisto: (productoId) => {
    const vistos = agregarAlFrente(get().vistos, productoId, MAX_VISTOS);
    set({ vistos });
    guardar(CLAVE_VISTOS, vistos);
  },

  registrarBusqueda: (texto) => {
    const limpio = texto.trim();
    if (limpio.length < 2) return;
    const busquedas = agregarAlFrente(
      get().busquedas,
      limpio,
      MAX_BUSQUEDAS,
      (a, b) => a.toLowerCase() === b.toLowerCase(),
    );
    set({ busquedas });
    guardar(CLAVE_BUSQUEDAS, busquedas);
  },

  borrarBusquedas: () => {
    set({ busquedas: [] });
    guardar(CLAVE_BUSQUEDAS, []);
  },
}));
