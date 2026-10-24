import { z } from 'zod';

const correo = z.string().trim().min(1, 'Ingresá tu correo').email('Ingresá un correo válido');

export const loginSchema = z.object({
  correo,
  contrasena: z.string().min(1, 'Ingresá tu contraseña'),
});

export const registerSchema = z
  .object({
    correo,
    usuario: z.string().trim().min(3, 'El usuario debe tener al menos 3 caracteres'),
    contrasena: z
      .string()
      .min(6, 'La contraseña debe tener al menos 6 caracteres')
      .regex(/[A-Z]/, 'La contraseña necesita una mayúscula')
      .regex(/[0-9]/, 'La contraseña necesita un número'),
    repetirContrasena: z.string(),
    quiereVender: z.boolean(),
  })
  .refine((datos) => datos.contrasena === datos.repetirContrasena, {
    message: 'Las contraseñas no coinciden',
    path: ['repetirContrasena'],
  });

export type LoginForm = z.infer<typeof loginSchema>;
export type RegisterForm = z.infer<typeof registerSchema>;
