import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';

import { confirmarCompra, ConfirmarCompraParams } from './comprasService';
import { createProducto, ProductoInput } from './productosService';

const DRAFTS_KEY = 'ny_drafts';

export type Borrador =
  | { id: string; tipo: 'producto'; creadoEn: number; payload: ProductoInput }
  | { id: string; tipo: 'compra'; creadoEn: number; payload: ConfirmarCompraParams };

type NuevoBorrador =
  | { tipo: 'producto'; payload: ProductoInput }
  | { tipo: 'compra'; payload: ConfirmarCompraParams };

export async function hayConexion() {
  const estado = await NetInfo.fetch();
  return Boolean(estado.isConnected) && estado.isInternetReachable !== false;
}

export async function leerBorradores(): Promise<Borrador[]> {
  try {
    const raw = await AsyncStorage.getItem(DRAFTS_KEY);
    return raw ? (JSON.parse(raw) as Borrador[]) : [];
  } catch {
    return [];
  }
}

async function guardarBorradores(borradores: Borrador[]) {
  await AsyncStorage.setItem(DRAFTS_KEY, JSON.stringify(borradores));
}

export async function encolarBorrador(nuevo: NuevoBorrador) {
  const borradores = await leerBorradores();
  const borrador = {
    ...nuevo,
    id: `draft-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    creadoEn: Date.now(),
  } as Borrador;

  await guardarBorradores([...borradores, borrador]);
}

let sincronizando = false;

/**
 * Procesa la cola `ny_drafts` en orden. Cada borrador se elimina sólo si se
 * subió bien; los que fallan quedan para el próximo intento. Las compras son
 * seguras de reintentar porque reutilizan su `operationKey`.
 * Devuelve cuántos borradores se sincronizaron.
 */
export async function sincronizarBorradores(): Promise<number> {
  if (sincronizando) {
    return 0;
  }

  sincronizando = true;
  let sincronizados = 0;

  try {
    const pendientes = await leerBorradores();
    const restantes: Borrador[] = [];

    for (const borrador of pendientes) {
      try {
        if (borrador.tipo === 'compra') {
          await confirmarCompra(borrador.payload);
        } else {
          await createProducto(borrador.payload);
        }
        sincronizados += 1;
      } catch {
        restantes.push(borrador);
      }
    }

    await guardarBorradores(restantes);
  } finally {
    sincronizando = false;
  }

  return sincronizados;
}
