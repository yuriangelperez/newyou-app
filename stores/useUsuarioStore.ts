import { supabase } from "../services/supabase";
import { User } from "@supabase/supabase-js";
import { create } from "zustand";

export interface UsuarioSesion {
  id: string;
  nombre: string;
  email: string;
  role: "comprador" | "vendedor";
}

interface UsuarioStore {
  usuario: UsuarioSesion | null;

  setUsuario: (usuario: UsuarioSesion | null) => void;

  clearUsuario: () => void;

  hidratarDesdeAuthUser: (authUser: User | null) => Promise<void>;
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

export const useUsuarioStore = create<UsuarioStore>((set) => ({
  usuario: null,

  setUsuario: (usuario) => set({ usuario }),

  clearUsuario: () => set({ usuario: null }),

  hidratarDesdeAuthUser: async (authUser) => {
    if (!authUser || !authUser.email) {
      set({ usuario: null });
      return;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", authUser.id)
      .single();

    const role =
      profile?.role === "vendedor"
        ? "vendedor"
        : "comprador";

    set({
      usuario: {
        id: authUser.id,
        nombre: resolverNombre(authUser),
        email: authUser.email,
        role,
      },
    });
  },
}));