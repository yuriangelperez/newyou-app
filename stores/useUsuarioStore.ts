import { supabase } from "../services/supabase";
import { isAuthRetryableFetchError, User } from "@supabase/supabase-js";
import { create } from "zustand";

import { RoleUsuario } from "../services/auth";
import { esAdminPlataforma } from "../services/empresasService";

export interface UsuarioSesion {
  id: string;
  nombre: string;
  email: string;
  role: RoleUsuario;
  /** Administrador de la plataforma (verifica empresas). El servidor lo vuelve a comprobar. */
  esAdmin?: boolean;
}

interface UsuarioStore {
  usuario: UsuarioSesion | null;

  setUsuario: (usuario: UsuarioSesion | null) => void;

  clearUsuario: () => void;

  hidratarDesdeAuthUser: (authUser: User | null) => Promise<void>;
}

// Cuentas registradas antes de la migración 05 traen 'vendedor' en la metadata.
function normalizarRole(valor: unknown): RoleUsuario {
  return valor === "particular" || valor === "vendedor" ? "particular" : "comprador";
}

function resolverNombre(authUser: User | null) {
  if (!authUser) {
    return "";
  }

  const username = authUser.user_metadata?.username;
  const fullName = authUser.user_metadata?.full_name;

  if (typeof username === "string" && username.trim().length > 0) {
    return username.trim();
  }

  if (typeof fullName === "string" && fullName.trim().length > 0) {
    return fullName.trim();
  }

  if (authUser.email) {
    return authUser.email.split("@")[0];
  }

  return "Usuario";
}

// Quién puede publicar y ver sus ventas. En la entrega de empresas se suma a los miembros con permiso.
export const selectPuedeVender = (state: Pick<UsuarioStore, "usuario">) =>
  state.usuario?.role === "particular";

export const useUsuarioStore = create<UsuarioStore>((set, get) => ({
  usuario: null,

  setUsuario: (usuario) => set({ usuario }),

  clearUsuario: () => set({ usuario: null }),

  hidratarDesdeAuthUser: async (authUser) => {
    if (!authUser || !authUser.email) {
      set({ usuario: null });
      return;
    }

    // Primero con los datos de la sesión guardada: con sesión el inicio nunca
    // muestra "invitado", aunque la red tarde o falle. Después se confirma con el servidor.
    const anterior = get().usuario;
    set({
      usuario: {
        id: authUser.id,
        nombre: resolverNombre(authUser),
        email: authUser.email,
        role: anterior?.id === authUser.id ? anterior.role : normalizarRole(authUser.user_metadata?.role),
        esAdmin: anterior?.id === authUser.id ? anterior.esAdmin : false,
      },
    });

    const { data: authData, error: authError } = await supabase.auth.getUser();

    // Sin red (modo offline) se mantiene la sesión guardada.
    if (isAuthRetryableFetchError(authError)) {
      return;
    }

    if (authError || !authData.user) {
      await supabase.auth.signOut();
      set({ usuario: null });
      return;
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", authData.user.id)
      .single();

    if (profileError) {
      await supabase
        .from("profiles")
        .upsert(
          {
            id: authData.user.id,
            role: normalizarRole(authData.user.user_metadata?.role),
          },
          { onConflict: "id" }
        );
    }

    const role = normalizarRole(profile?.role ?? authData.user.user_metadata?.role);
    const esAdmin = await esAdminPlataforma();

    set({
      usuario: {
        id: authData.user.id,
        nombre: resolverNombre(authData.user),
        email: authData.user.email || authUser.email,
        role,
        esAdmin,
      },
    });
  },
}));