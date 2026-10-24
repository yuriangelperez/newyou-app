import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";

import { Membresia, obtenerMisEmpresas, Permiso } from "../services/empresasService";

const CLAVE_EMPRESA_ACTIVA = "ny_empresa_activa";

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
      const activa = Number(guardada);
      const sigueSiendoMiembro = membresias.some((item) => item.empresaId === activa);

      set({ membresias, empresaActivaId: sigueSiendoMiembro ? activa : null });
    } catch {
      // Sin la migración 06 o sin red: la app sigue funcionando en modo personal.
      set({ membresias: [], empresaActivaId: null });
    } finally {
      set({ cargando: false });
    }
  },

  setEmpresaActiva: async (empresaId) => {
    const valida = empresaId === null || get().membresias.some((item) => item.empresaId === empresaId);
    const nueva = valida ? empresaId : null;

    set({ empresaActivaId: nueva });

    try {
      if (nueva === null) {
        await AsyncStorage.removeItem(CLAVE_EMPRESA_ACTIVA);
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
