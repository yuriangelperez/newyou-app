import { loginSchema, registerSchema } from '../schemas/authSchemas';

const registroValido = {
  correo: 'ana@mail.com',
  usuario: 'ana',
  contrasena: 'Clave123',
  repetirContrasena: 'Clave123',
  quiereVender: false,
  comoEmpresa: false,
};

const primerError = (resultado: { success: boolean; error?: { issues: { message: string }[] } }) =>
  resultado.error?.issues[0]?.message;

describe('loginSchema', () => {
  it('acepta correo y contraseña', () => {
    expect(loginSchema.safeParse({ identificador: ' ana@mail.com ', contrasena: 'x' }).success).toBe(true);
  });

  it('acepta el nombre de usuario en lugar del correo', () => {
    expect(loginSchema.safeParse({ identificador: 'ana perez', contrasena: 'x' }).success).toBe(true);
  });

  it('rechaza un correo inválido antes de llamar al servidor', () => {
    expect(primerError(loginSchema.safeParse({ identificador: 'ana@', contrasena: 'x' }))).toBe(
      'Ingresá un correo válido',
    );
  });
});

describe('registerSchema', () => {
  it('acepta un registro válido', () => {
    expect(registerSchema.safeParse(registroValido).success).toBe(true);
  });

  it('exige mayúscula, minúscula y número en la contraseña', () => {
    const sinMayuscula = { ...registroValido, contrasena: 'clave123', repetirContrasena: 'clave123' };
    const sinMinuscula = { ...registroValido, contrasena: 'ROPA2026', repetirContrasena: 'ROPA2026' };
    const sinNumero = { ...registroValido, contrasena: 'Claveabc', repetirContrasena: 'Claveabc' };

    expect(primerError(registerSchema.safeParse(sinMayuscula))).toBe('La contraseña necesita una mayúscula');
    expect(primerError(registerSchema.safeParse(sinMinuscula))).toBe('La contraseña necesita una minúscula');
    expect(primerError(registerSchema.safeParse(sinNumero))).toBe('La contraseña necesita un número');
  });

  it('limita el usuario a 15 caracteres: letras, números y espacios entre palabras', () => {
    const conUsuario = (usuario: string) => primerError(registerSchema.safeParse({ ...registroValido, usuario }));

    expect(conUsuario('Ana Pérez 2')).toBeUndefined();
    expect(conUsuario('x'.repeat(16))).toBe('El usuario puede tener hasta 15 caracteres');
    expect(conUsuario('ana_perez')).toBe('El usuario sólo puede tener letras, números y espacios entre palabras');
    expect(conUsuario('ana  perez')).toBe('El usuario sólo puede tener letras, números y espacios entre palabras');
    expect(conUsuario('ana 😀')).toBe('El usuario sólo puede tener letras, números y espacios entre palabras');
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
