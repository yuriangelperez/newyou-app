import * as Linking from 'expo-linking';

import { supabase } from './supabase';

export async function signInWithPassword(
  email: string,
  password: string
) {
  try {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    return { error };
  } catch (error) {
    return { error: toAuthError(error) };
  }
}

export type RoleUsuario = 'comprador' | 'particular';

export async function signUpWithPassword(
  email: string,
  password: string,
  username: string,
  role: RoleUsuario
) {
  try {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          username,
          role,
        },
      },
    });

    return { error };
  } catch (error) {
    return { error: toAuthError(error) };
  }
}

/** Ruta a la que vuelve el enlace del correo (newyou://nueva-contrasena, o la URL web en el navegador). */
export const URL_NUEVA_CONTRASENA = () => Linking.createURL('nueva-contrasena');

/** Envía el correo para restablecer la contraseña. */
export async function enviarRecuperacion(email: string) {
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: URL_NUEVA_CONTRASENA(),
    });

    return { error };
  } catch (error) {
    return { error: toAuthError(error) };
  }
}

/**
 * Lee los datos que agrega Supabase al enlace del correo y abre la sesión de recuperación.
 * Soporta el flujo implícito (#access_token=...&refresh_token=...) y el PKCE (?code=...).
 */
export async function abrirSesionDesdeEnlace(url: string | null) {
  if (!url) {
    return { error: new Error('Abrí esta pantalla desde el enlace del correo.') };
  }

  const params = new URLSearchParams(
    [url.split('#')[1] ?? '', url.split('?')[1]?.split('#')[0] ?? ''].filter(Boolean).join('&'),
  );

  const descripcionError = params.get('error_description');
  if (descripcionError) {
    return { error: new Error(descripcionError.replace(/\+/g, ' ')) };
  }

  try {
    const code = params.get('code');
    if (code) {
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      return { error };
    }

    const accessToken = params.get('access_token');
    const refreshToken = params.get('refresh_token');
    if (accessToken && refreshToken) {
      const { error } = await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
      return { error };
    }

    return { error: new Error('El enlace no es válido o ya venció. Pedí uno nuevo.') };
  } catch (error) {
    return { error: toAuthError(error) };
  }
}

export async function actualizarContrasena(contrasena: string) {
  try {
    const { error } = await supabase.auth.updateUser({ password: contrasena });
    return { error };
  } catch (error) {
    return { error: toAuthError(error) };
  }
}

function toAuthError(error: unknown) {
  if (error instanceof Error) {
    return error;
  }

  return new Error('No se pudo conectar con Supabase');
}