import type { User } from '@supabase/supabase-js';

import { TipoTerminos, VERSION_TERMINOS } from '../constants/terminos';
import { errorTraducido } from './erroresSupabase';
import { supabase } from './supabase';

/** ¿El usuario logueado ya aceptó la versión vigente de estos términos? */
export async function terminosAceptados(tipo: TipoTerminos, version = VERSION_TERMINOS) {
  const { data, error } = await supabase
    .from('terminos_aceptaciones')
    .select('version')
    .eq('tipo', tipo)
    .eq('version', version)
    .maybeSingle();

  if (error) {
    throw errorTraducido(error);
  }
  return Boolean(data);
}

/** Guarda que el usuario logueado aceptó la versión vigente (si ya estaba, no hace nada). */
export async function aceptarTerminos(tipo: TipoTerminos, version = VERSION_TERMINOS) {
  const { error } = await supabase.rpc('aceptar_terminos', { p_tipo: tipo, p_version: version });
  if (error) {
    throw errorTraducido(error);
  }
}

/** Versión que el usuario aceptó al registrarse (queda en los metadatos hasta que inicia sesión). */
export function versionAceptadaEnRegistro(user: Pick<User, 'user_metadata'> | null) {
  const valor = user?.user_metadata?.terminos_version;
  return typeof valor === 'string' ? valor : null;
}

/**
 * Al iniciar sesión: devuelve true si falta aceptar los términos de comprador.
 * Si los aceptó en el registro (casilla obligatoria), se guardan acá sin volver a preguntar.
 */
export async function faltaAceptarTerminos(user: Pick<User, 'user_metadata'> | null) {
  if (await terminosAceptados('comprador')) {
    return false;
  }
  if (versionAceptadaEnRegistro(user) === VERSION_TERMINOS) {
    await aceptarTerminos('comprador');
    return false;
  }
  return true;
}
