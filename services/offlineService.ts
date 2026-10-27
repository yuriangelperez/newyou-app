import AsyncStorage from '@react-native-async-storage/async-storage';

import { confirmarCompra, ConfirmarCompraParams } from './comprasService';
import { traducirError } from './erroresSupabase';
import { createProducto, DIAS_BORRADOR, ProductoInput, updateProducto } from './productosService';

const DRAFTS_KEY = 'ny_drafts';
const VIGENCIA_BORRADOR_MS = DIAS_BORRADOR * 24 * 60 * 60 * 1000;

interface BorradorBase {
  id: string;
  creadoEn: number;
  /** Último error del servidor al intentar subirlo (se avisa una sola vez por error). */
  error?: string;
}

export type Borrador =
  | (BorradorBase & { tipo: 'producto'; payload: ProductoInput })
  | (BorradorBase & { tipo: 'edicion'; productoId: string; payload: ProductoInput })
  | (BorradorBase & { tipo: 'compra'; payload: ConfirmarCompraParams });

type NuevoBorrador =
  | { tipo: 'producto'; payload: ProductoInput }
  | { tipo: 'edicion'; productoId: string; payload: ProductoInput }
  | { tipo: 'compra'; payload: ConfirmarCompraParams };

export { hayConexion } from './conexion';

/** Las publicaciones (altas y ediciones) guardadas sin conexión duran 7 días; las compras no vencen. */
const vencido = (borrador: Borrador, ahora: number) =>
  borrador.tipo !== 'compra' && ahora - borrador.creadoEn > VIGENCIA_BORRADOR_MS;

export async function leerBorradores(): Promise<Borrador[]> {
  try {
    const raw = await AsyncStorage.getItem(DRAFTS_KEY);
    const borradores = raw ? (JSON.parse(raw) as Borrador[]) : [];
    const ahora = Date.now();
    const vigentes = borradores.filter((borrador) => !vencido(borrador, ahora));

    if (vigentes.length !== borradores.length) {
      await guardarBorradores(vigentes);
    }

    return vigentes;
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

  // Una edición nueva de la misma prenda reemplaza a la anterior pendiente.
  const resto =
    nuevo.tipo === 'edicion'
      ? borradores.filter((item) => !(item.tipo === 'edicion' && item.productoId === nuevo.productoId))
      : borradores;

  await guardarBorradores([...resto, borrador]);
}

/** Altas y ediciones de prendas que esperan conexión (para la sección Borradores). */
export async function leerBorradoresDePublicaciones() {
  const borradores = await leerBorradores();
  return borradores.filter(
    (borrador): borrador is Exclude<Borrador, { tipo: 'compra' }> => borrador.tipo !== 'compra',
  );
}

export async function descartarBorrador(id: string) {
  const borradores = await leerBorradores();
  await guardarBorradores(borradores.filter((borrador) => borrador.id !== id));
}

export interface ResultadoSincronizacion {
  sincronizados: number;
  /** Errores nuevos del servidor, para avisarle al usuario. */
  errores: string[];
}

let sincronizando = false;

/**
 * Procesa la cola `ny_drafts` en orden. Cada borrador se elimina sólo si se
 * subió bien; los que fallan quedan para el próximo intento y su error se
 * informa (una vez). Las compras son seguras de reintentar porque reutilizan
 * su `operationKey`.
 */
export async function sincronizarBorradores(): Promise<ResultadoSincronizacion> {
  if (sincronizando) {
    return { sincronizados: 0, errores: [] };
  }

  sincronizando = true;
  let sincronizados = 0;
  const errores: string[] = [];

  try {
    const pendientes = await leerBorradores();
    const restantes: Borrador[] = [];

    for (const borrador of pendientes) {
      try {
        if (borrador.tipo === 'compra') {
          await confirmarCompra(borrador.payload);
        } else if (borrador.tipo === 'edicion') {
          await updateProducto(borrador.productoId, borrador.payload);
        } else {
          await createProducto(borrador.payload);
        }
        sincronizados += 1;
      } catch (error) {
        const mensaje = traducirError(error);
        const nombre = borrador.tipo === 'compra' ? 'Compra pendiente' : `"${borrador.payload.nombre}"`;
        if (borrador.error !== mensaje) {
          errores.push(`${nombre}: ${mensaje}`);
        }
        restantes.push({ ...borrador, error: mensaje });
      }
    }

    await guardarBorradores(restantes);
  } finally {
    sincronizando = false;
  }

  return { sincronizados, errores };
}
