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

export type RoleUsuario = 'comprador' | 'vendedor';

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

function toAuthError(error: unknown) {
  if (error instanceof Error) {
    return error;
  }

  return new Error('No se pudo conectar con Supabase');
}