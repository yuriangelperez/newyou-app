import { usuarioDisponible } from './auth';
import { errorTraducido } from './erroresSupabase';
import { supabase } from './supabase';

export interface Preferencias {
  /** Correo con el detalle de cada compra. */
  notifCorreo: boolean;
  /** Promociones y novedades por correo. */
  notifPromos: boolean;
}

const PREFERENCIAS_POR_DEFECTO: Preferencias = { notifCorreo: true, notifPromos: false };

async function usuarioActual() {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) {
    throw new Error('Tenés que iniciar sesión.');
  }
  return data.user;
}

/** Preferencias guardadas en el perfil (columnas de la migración 16). */
export async function obtenerPreferencias(): Promise<Preferencias> {
  const user = await usuarioActual();
  const { data, error } = await supabase
    .from('profiles')
    .select('notif_correo, notif_promos')
    .eq('id', user.id)
    .maybeSingle();

  if (error || !data) {
    return PREFERENCIAS_POR_DEFECTO;
  }

  return {
    notifCorreo: data.notif_correo ?? PREFERENCIAS_POR_DEFECTO.notifCorreo,
    notifPromos: data.notif_promos ?? PREFERENCIAS_POR_DEFECTO.notifPromos,
  };
}

export async function guardarPreferencias(cambios: Partial<Preferencias>) {
  const user = await usuarioActual();
  const fila: Record<string, boolean> = {};
  if (cambios.notifCorreo !== undefined) fila.notif_correo = cambios.notifCorreo;
  if (cambios.notifPromos !== undefined) fila.notif_promos = cambios.notifPromos;

  const { error } = await supabase.from('profiles').update(fila).eq('id', user.id);
  if (error) {
    throw errorTraducido(error);
  }
}

export interface ResultadoPerfil {
  /** Cambió el correo: Supabase manda un enlace de confirmación a la dirección nueva. */
  correoPendiente: boolean;
}

/** Cambia el nombre de usuario y, si es distinto, el correo (queda pendiente de confirmar). */
export async function actualizarPerfil({ usuario, correo }: { usuario: string; correo: string }): Promise<ResultadoPerfil> {
  const user = await usuarioActual();
  const nombre = usuario.trim();
  const email = correo.trim().toLowerCase();
  const nombreActual = String(user.user_metadata?.username ?? '');

  if (nombre !== nombreActual) {
    if (!(await usuarioDisponible(nombre, user.id))) {
      throw new Error('Ese usuario ya está en uso. Elegí otro.');
    }

    const { error } = await supabase.from('profiles').update({ username: nombre }).eq('id', user.id);
    if (error) {
      throw errorTraducido(error);
    }
  }

  const cambiaCorreo = email !== (user.email ?? '').toLowerCase();
  const { error } = await supabase.auth.updateUser({
    data: { username: nombre },
    ...(cambiaCorreo ? { email } : {}),
  });
  if (error) {
    throw errorTraducido(error);
  }

  return { correoPendiente: cambiaCorreo };
}
