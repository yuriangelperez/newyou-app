import { supabase } from './supabase';

export async function signInWithPassword(email: string, password: string) {
  if (!supabase) {
    return { error: new Error('Supabase todavía no está configurado') };
  }

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

export async function signUpWithPassword(email: string, password: string, username: string) {
  if (!supabase) {
    return { error: new Error('Supabase todavía no está configurado') };
  }

  try {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          username,
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
