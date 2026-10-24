import { loginSchema, registerSchema } from '../schemas/authSchemas';

const registroValido = {
  correo: 'ana@mail.com',
  usuario: 'ana',
  contrasena: 'Clave123',
  repetirContrasena: 'Clave123',
  quiereVender: false,
};

const primerError = (resultado: { success: boolean; error?: { issues: { message: string }[] } }) =>
  resultado.error?.issues[0]?.message;

describe('loginSchema', () => {
  it('acepta correo y contraseña', () => {
    expect(loginSchema.safeParse({ correo: ' ana@mail.com ', contrasena: 'x' }).success).toBe(true);
  });

  it('rechaza un correo inválido antes de llamar al servidor', () => {
    expect(primerError(loginSchema.safeParse({ correo: 'ana', contrasena: 'x' }))).toBe(
      'Ingresá un correo válido',
    );
  });
});

describe('registerSchema', () => {
  it('acepta un registro válido', () => {
    expect(registerSchema.safeParse(registroValido).success).toBe(true);
  });

  it('exige mayúscula y número en la contraseña', () => {
    const sinMayuscula = { ...registroValido, contrasena: 'clave123', repetirContrasena: 'clave123' };
    const sinNumero = { ...registroValido, contrasena: 'Claveabc', repetirContrasena: 'Claveabc' };

    expect(primerError(registerSchema.safeParse(sinMayuscula))).toBe('La contraseña necesita una mayúscula');
    expect(primerError(registerSchema.safeParse(sinNumero))).toBe('La contraseña necesita un número');
  });

  it('marca en "repetir" cuando las contraseñas no coinciden (refine)', () => {
    const resultado = registerSchema.safeParse({ ...registroValido, repetirContrasena: 'Otra1234' });

    expect(resultado.success).toBe(false);
    expect(resultado.error?.issues[0]).toMatchObject({
      path: ['repetirContrasena'],
      message: 'Las contraseñas no coinciden',
    });
  });
});
