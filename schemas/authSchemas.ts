import { z } from 'zod';

const correo = z.string().trim().min(1, 'Ingresá tu correo').email('Ingresá un correo válido');

// Letras (con tilde y ñ), números y espacios sólo entre palabras.
const USUARIO_VALIDO = /^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ0-9]+( [A-Za-zÁÉÍÓÚÜÑáéíóúüñ0-9]+)*$/;
export const USUARIO_MAX = 15;

export const usuarioSchema = z
  .string()
  .trim()
  .min(3, 'El usuario debe tener al menos 3 caracteres')
  .max(USUARIO_MAX, `El usuario puede tener hasta ${USUARIO_MAX} caracteres`)
  .regex(USUARIO_VALIDO, 'El usuario sólo puede tener letras, números y espacios entre palabras');

// En el login se puede ingresar con el correo o con el nombre de usuario.
export const loginSchema = z.object({
  identificador: z
    .string()
    .trim()
    .min(1, 'Ingresá tu correo o usuario')
    .superRefine((valor, context) => {
      if (valor.includes('@')) {
        if (!z.string().email().safeParse(valor).success) {
          context.addIssue({ code: 'custom', message: 'Ingresá un correo válido' });
        }
        return;
      }

      if (!usuarioSchema.safeParse(valor).success) {
        context.addIssue({ code: 'custom', message: 'Ingresá un correo o usuario válido' });
      }
    }),
  contrasena: z.string().min(1, 'Ingresá tu contraseña'),
});

// Requisitos de la contraseña. Los usa el esquema y la lista que se valida mientras se escribe.
export const REQUISITOS_CONTRASENA = [
  { id: 'largo', texto: 'Al menos 6 caracteres', cumple: (valor: string) => valor.length >= 6, error: 'La contraseña debe tener al menos 6 caracteres' },
  { id: 'mayuscula', texto: 'Una letra mayúscula', cumple: (valor: string) => /[A-Z]/.test(valor), error: 'La contraseña necesita una mayúscula' },
  { id: 'minuscula', texto: 'Una letra minúscula', cumple: (valor: string) => /[a-z]/.test(valor), error: 'La contraseña necesita una minúscula' },
  { id: 'numero', texto: 'Un número', cumple: (valor: string) => /[0-9]/.test(valor), error: 'La contraseña necesita un número' },
] as const;

export const contrasenaSchema = z.string().superRefine((valor, context) => {
  const pendiente = REQUISITOS_CONTRASENA.find((requisito) => !requisito.cumple(valor));
  if (pendiente) {
    context.addIssue({ code: 'custom', message: pendiente.error });
  }
});

export const registerSchema = z
  .object({
    correo,
    usuario: usuarioSchema,
    contrasena: contrasenaSchema,
    repetirContrasena: z.string(),
    quiereVender: z.boolean(),
    comoEmpresa: z.boolean(),
    aceptaTerminos: z.boolean().refine((valor) => valor, 'Tenés que aceptar los términos y condiciones'),
  })
  .refine((datos) => datos.contrasena === datos.repetirContrasena, {
    message: 'Las contraseñas no coinciden',
    path: ['repetirContrasena'],
  });

// Editar perfil: el usuario siempre; el correo, sólo si lo cambia.
export const perfilSchema = z.object({
  usuario: usuarioSchema,
  correo,
});

export type LoginForm = z.infer<typeof loginSchema>;
export type RegisterForm = z.infer<typeof registerSchema>;
export type PerfilForm = z.infer<typeof perfilSchema>;
