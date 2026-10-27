import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";

import { Membresia, obtenerMisEmpresas, Permiso } from "../services/empresasService";

const CLAVE_EMPRESA_ACTIVA = "ny_empresa_activa";
// Elección explícita de actuar "como yo" (sin esto, un empleado arranca en su empresa).
const MODO_PERSONAL = "yo";

interface EmpresaStore {
  membresias: Membresia[];
  /** Empresa con la que el usuario actúa; `null` = "como yo". Sólo afecta a la interfaz. */
  empresaActivaId: number | null;
  cargando: boolean;

  cargar: () => Promise<void>;
  setEmpresaActiva: (empresaId: number | null) => Promise<void>;
  limpiar: () => void;
}

export const selectEmpresaActiva = (state: Pick<EmpresaStore, "membresias" | "empresaActivaId">) =>
  state.membresias.find((item) => item.empresaId === state.empresaActivaId) ?? null;

/** El propietario de una empresa vende sólo como empresa: no tiene el modo "Yo" para vender. */
export const selectEsPropietario = (state: Pick<EmpresaStore, "membresias">) =>
  state.membresias.some((item) => item.rol === "propietario");

/**
 * Empresa con la que arranca: la elegida antes; si no eligió nada, el modo empresa es el
 * predeterminado (la primera suya si es propietario, si no la primera donde trabaja).
 * Un empleado que eligió "como yo" sigue así; un propietario nunca vende como particular.
 */
const empresaInicial = (membresias: Membresia[], elegida: number | typeof MODO_PERSONAL | null) => {
  if (membresias.some((item) => item.empresaId === elegida)) {
    return elegida as number;
  }

  const propia = membresias.find((item) => item.rol === "propietario")?.empresaId;
  if (propia !== undefined) {
    return propia;
  }

  return elegida === MODO_PERSONAL ? null : (membresias[0]?.empresaId ?? null);
};

const leerGuardada = (valor: string | null) =>
  valor === MODO_PERSONAL ? MODO_PERSONAL : valor ? Number(valor) : null;

/** Permisos de la empresa activa; la base de datos vuelve a verificarlos en cada operación. */
export const puede = (membresia: Membresia | null, permiso: Permiso, sedeId?: number) =>
  Boolean(
    membresia &&
      membresia.permisos.includes(permiso) &&
      (sedeId === undefined || membresia.todasLasSedes || membresia.sedesPermitidas.includes(sedeId)),
  );

export const useEmpresaStore = create<EmpresaStore>((set, get) => ({
  membresias: [],
  empresaActivaId: null,
  cargando: false,

  cargar: async () => {
    set({ cargando: true });

    try {
      const [membresias, guardada] = await Promise.all([
        obtenerMisEmpresas(),
        AsyncStorage.getItem(CLAVE_EMPRESA_ACTIVA).catch(() => null),
      ]);
      set({ membresias, empresaActivaId: empresaInicial(membresias, leerGuardada(guardada)) });
    } catch {
      // Sin la migración 06 o sin red: la app sigue funcionando en modo personal.
      set({ membresias: [], empresaActivaId: null });
    } finally {
      set({ cargando: false });
    }
  },

  setEmpresaActiva: async (empresaId) => {
    const { membresias } = get();
    const valida = empresaId === null || membresias.some((item) => item.empresaId === empresaId);
    const nueva = valida ? empresaInicial(membresias, empresaId ?? MODO_PERSONAL) : get().empresaActivaId;

    set({ empresaActivaId: nueva });

    try {
      if (nueva === null) {
        await AsyncStorage.setItem(CLAVE_EMPRESA_ACTIVA, MODO_PERSONAL);
      } else {
        await AsyncStorage.setItem(CLAVE_EMPRESA_ACTIVA, String(nueva));
      }
    } catch {
      // Recordar la elección es una comodidad; si falla, se pierde al reiniciar.
    }
  },

  limpiar: () => {
    set({ membresias: [], empresaActivaId: null });
    void AsyncStorage.removeItem(CLAVE_EMPRESA_ACTIVA).catch(() => {});
  },
}));
