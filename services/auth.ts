import * as Linking from 'expo-linking';

import { errorTraducido } from './erroresSupabase';
import { supabase } from './supabase';

const CREDENCIALES_INCORRECTAS = 'Correo/usuario o contraseña incorrectos.';

/** Busca el correo de un nombre de usuario (sin distinguir mayúsculas) para ingresar con él. */
async function correoDeUsuario(usuario: string) {
  const { data, error } = await supabase.rpc('correo_de_usuario', { p_usuario: usuario.trim() });
  if (error) {
    throw error;
  }
  return typeof data === 'string' && data ? data : null;
}

/** Ingresa con el correo o con el nombre de usuario. */
export async function signInWithPassword(
  identificador: string,
  password: string
) {
  try {
    const valor = identificador.trim();
    const email = valor.includes('@') ? valor : await correoDeUsuario(valor);

    // Mismo mensaje que con una contraseña incorrecta: no se revela si el usuario existe.
    if (!email) {
      return { error: new Error(CREDENCIALES_INCORRECTAS), quiereCrearEmpresa: false };
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    return {
      error: error ? errorTraducido(error) : null,
      quiereCrearEmpresa: data?.user?.user_metadata?.crear_empresa === true,
    };
  } catch (error) {
    return { error: toAuthError(error), quiereCrearEmpresa: false };
  }
}

/** true si nadie usa ese nombre de usuario (sin distinguir mayúsculas). */
export async function usuarioDisponible(usuario: string, excepto?: string) {
  const { data, error } = await supabase.rpc('usuario_disponible', {
    p_usuario: usuario.trim(),
    ...(excepto ? { p_excepto: excepto } : {}),
  });
  if (error) {
    throw error;
  }
  return data === true;
}

export type RoleUsuario = 'comprador' | 'particular';

export async function signUpWithPassword(
  email: string,
  password: string,
  username: string,
  role: RoleUsuario,
  /** Se registra para vender como empresa: al entrar por primera vez va a crearla. */
  crearEmpresa = false
) {
  try {
    if (!(await usuarioDisponible(username))) {
      return { error: new Error('Ese usuario ya está en uso. Elegí otro.') };
    }

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          username,
          role,
          ...(crearEmpresa ? { crear_empresa: true } : {}),
        },
      },
    });

    return { error: error ? errorTraducido(error) : null };
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

    return { error: error ? errorTraducido(error) : null };
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
    return { error: errorTraducido(descripcionError.replace(/\+/g, ' ')) };
  }

  try {
    const code = params.get('code');
    if (code) {
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      return { error: error ? errorTraducido(error) : null };
    }

    const accessToken = params.get('access_token');
    const refreshToken = params.get('refresh_token');
    if (accessToken && refreshToken) {
      const { error } = await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
      return { error: error ? errorTraducido(error) : null };
    }

    return { error: new Error('El enlace no es válido o ya venció. Pedí uno nuevo.') };
  } catch (error) {
    return { error: toAuthError(error) };
  }
}

export async function actualizarContrasena(contrasena: string) {
  try {
    const { error } = await supabase.auth.updateUser({ password: contrasena });
    return { error: error ? errorTraducido(error) : null };
  } catch (error) {
    return { error: toAuthError(error) };
  }
}

function toAuthError(error: unknown) {
  if (error instanceof Error) {
    return errorTraducido(error);
  }

  return new Error('No se pudo conectar con el servidor. Revisá tu conexión.');
}