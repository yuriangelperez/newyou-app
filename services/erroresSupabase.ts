// Traduce los mensajes que devuelven Supabase Auth, PostgREST y la red a un texto en español
// que el usuario entienda. Los mensajes propios de las funciones SQL ya están en español y se dejan igual.

const TRADUCCIONES: [RegExp, string][] = [
  [/invalid login credentials/i, 'Correo/usuario o contraseña incorrectos.'],
  [/email not confirmed/i, 'Tenés que confirmar tu correo antes de ingresar. Revisá tu bandeja de entrada.'],
  [/user already registered|already been registered|email_exists/i, 'Ya existe una cuenta con ese correo.'],
  [/profiles_username_unico|usuario ya está en uso/i, 'Ese usuario ya está en uso. Elegí otro.'],
  [/database error saving new user/i, 'No se pudo crear la cuenta. Puede que ese usuario ya esté en uso.'],
  [/password should be at least|weak.?password/i, 'La contraseña es demasiado débil o corta.'],
  [/new password should be different/i, 'La nueva contraseña tiene que ser distinta de la anterior.'],
  [/unable to validate email address|invalid format|email address .* is invalid/i, 'Ingresá un correo válido.'],
  [
    /rate limit|over_email_send_rate_limit|you can only request this after|too many requests/i,
    'Hiciste demasiados intentos. Esperá unos minutos y probá de nuevo.',
  ],
  [/signups? (not allowed|is disabled)/i, 'El registro está deshabilitado por el momento.'],
  [/user not found/i, 'No encontramos una cuenta con esos datos.'],
  [
    /email link is invalid|otp_expired|token has expired|invalid (refresh|flow state)/i,
    'El enlace no es válido o ya venció. Pedí uno nuevo.',
  ],
  [/jwt expired|invalid jwt|auth session missing|session.*(expired|not found)/i, 'Tu sesión venció. Volvé a iniciar sesión.'],
  [
    /network request failed|failed to fetch|fetch failed|networkerror|load failed|timeout/i,
    'Sin conexión. Revisá tu Internet e intentá de nuevo.',
  ],
  [/row-level security|permission denied|not authorized/i, 'No tenés permiso para hacer esto.'],
  [/duplicate key value/i, 'Ese dato ya está registrado.'],
  [/expected number, received nan/i, 'Ingresá sólo números.'],
];

// Palabras que delatan un mensaje en inglés que no tiene traducción propia.
const INGLES = /\b(the|is|not|invalid|error|failed|should|must|cannot|unable|already|exceeded|request|missing|unexpected|could)\b/i;

export const MENSAJE_GENERICO = 'Ocurrió un error. Intentá de nuevo en unos minutos.';

export function traducirError(error: unknown): string {
  const mensaje =
    typeof error === 'string'
      ? error
      : error && typeof error === 'object' && 'message' in error
        ? String((error as { message: unknown }).message ?? '')
        : '';

  if (!mensaje.trim()) {
    return MENSAJE_GENERICO;
  }

  const traduccion = TRADUCCIONES.find(([patron]) => patron.test(mensaje));
  if (traduccion) {
    return traduccion[1];
  }

  return INGLES.test(mensaje) ? MENSAJE_GENERICO : mensaje;
}

/** Mismo error con el mensaje traducido (para devolverlo donde se espera un Error). */
export function errorTraducido(error: unknown): Error {
  return new Error(traducirError(error));
}
