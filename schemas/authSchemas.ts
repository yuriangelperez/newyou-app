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

export const contrasenaSchema = z
  .string()
  .min(6, 'La contraseña debe tener al menos 6 caracteres')
  .regex(/[A-Z]/, 'La contraseña necesita una mayúscula')
  .regex(/[a-z]/, 'La contraseña necesita una minúscula')
  .regex(/[0-9]/, 'La contraseña necesita un número');

export const registerSchema = z
  .object({
    correo,
    usuario: usuarioSchema,
    contrasena: contrasenaSchema,
    repetirContrasena: z.string(),
    quiereVender: z.boolean(),
    comoEmpresa: z.boolean(),
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
