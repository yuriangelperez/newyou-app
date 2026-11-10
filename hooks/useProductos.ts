import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';

import { traducirError } from '../services/erroresSupabase';
import { hayConexion } from '../services/conexion';
import { getProductos as getProductosApi } from '../services/productosApiService';
import {
  getProductos as getProductosSupabase,
  subscribeToProductos,
} from '../services/productosService';
import { Producto } from '../types';

// Clase 12: la UI no sabe de dónde vienen los datos. Por defecto Supabase; con
// EXPO_PUBLIC_FUENTE_PRODUCTOS=dummyjson se usa la API REST de prueba con Axios.
const usarApiRest = process.env.EXPO_PUBLIC_FUENTE_PRODUCTOS === 'dummyjson';
const getProductos = usarApiRest ? getProductosApi : getProductosSupabase;

interface UseProductosResult {
  productos: Producto[];
  cargando: boolean;
  refreshing: boolean;
  error: string | null;
  /** El error es por falta de conexión (no un error del servidor). */
  sinConexion: boolean;
  refrescar: () => Promise<void>;
}

export const MENSAJE_SIN_CONEXION = 'Revisá tu conexión a Internet y volvé a intentar.';

/** Resultado de una consulta del catálogo, ya listo para guardar en el estado. */
type Consulta =
  | { tipo: 'ok'; productos: Producto[] }
  | { tipo: 'sinConexion' }
  | { tipo: 'error'; mensaje: string };

async function consultarCatalogo(): Promise<Consulta> {
  try {
    // Sin red no se muestra el catálogo viejo: daría la falsa sensación de que funciona.
    if (!(await hayConexion())) {
      return { tipo: 'sinConexion' };
    }

    return { tipo: 'ok', productos: await getProductos() };
  } catch (err) {
    return { tipo: 'error', mensaje: err instanceof Error ? traducirError(err) : 'No se pudo cargar el catálogo.' };
  }
}

export function useProductos(): UseProductosResult {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [cargando, setCargando] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [sinConexion, setSinConexion] = useState(false);

  // Los setState se hacen cuando llega la respuesta, nunca de forma síncrona.
  const cargar = useCallback(
    () =>
      consultarCatalogo().then((consulta) => {
        if (consulta.tipo === 'sinConexion') {
          setProductos([]);
          setSinConexion(true);
          setError(MENSAJE_SIN_CONEXION);
        } else if (consulta.tipo === 'ok') {
          setError(null);
          setSinConexion(false);
          setProductos(consulta.productos);
        } else {
          setError(consulta.mensaje);
        }
      }),
    [],
  );

  // Primera carga: el estado ya arranca con cargando=true.
  useEffect(() => {
    void cargar().finally(() => setCargando(false));
  }, [cargar]);

  const refrescar = useCallback(async () => {
    setRefreshing(true);
    try {
      await cargar();
    } finally {
      setRefreshing(false);
    }
  }, [cargar]);

  // Al volver a la pantalla (p. ej. tras editar stock en "Mis publicaciones")
  // se recarga el catálogo sin spinner. La primera carga ya la hace el efecto de arriba.
  const primerFoco = useRef(true);
  useFocusEffect(
    useCallback(() => {
      if (primerFoco.current) {
        primerFoco.current = false;
        return;
      }

      void cargar();
    }, [cargar]),
  );

  useEffect(() => {
    // La API REST no tiene tiempo real: sólo Supabase avisa cambios.
    if (usarApiRest) {
      return;
    }

    let unsubscribe = () => {};

    try {
      unsubscribe = subscribeToProductos(() => {
        void cargar();
      });
    } catch {
      unsubscribe = () => {};
    }

    return () => {
      unsubscribe();
    };
  }, [cargar]);

  return {
    productos,
    cargando,
    refreshing,
    error,
    sinConexion,
    refrescar,
  };
}
