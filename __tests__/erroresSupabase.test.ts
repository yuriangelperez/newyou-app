import { MENSAJE_GENERICO, traducirError } from '../services/erroresSupabase';

describe('traducirError', () => {
  it('traduce los mensajes de Supabase Auth al español', () => {
    expect(traducirError(new Error('Invalid login credentials'))).toBe('Correo/usuario o contraseña incorrectos.');
    expect(traducirError({ message: 'Email not confirmed' })).toMatch(/confirmar tu correo/);
    expect(traducirError('User already registered')).toBe('Ya existe una cuenta con ese correo.');
    expect(traducirError('email rate limit exceeded')).toMatch(/demasiados intentos/);
    expect(traducirError(new TypeError('Network request failed'))).toMatch(/Sin conexión/);
  });

  it('deja igual los mensajes que ya están en español (los de las funciones SQL)', () => {
    expect(traducirError(new Error('Stock insuficiente para "Campera"'))).toBe('Stock insuficiente para "Campera"');
  });

  it('cambia por uno genérico los mensajes en inglés que no conoce', () => {
    expect(traducirError(new Error('Something unexpected happened'))).toBe(MENSAJE_GENERICO);
    expect(traducirError(undefined)).toBe(MENSAJE_GENERICO);
  });
});
