import { reenviarConfirmacion, signInWithPassword, signUpWithPassword } from '../services/auth';

const mockSignUp = jest.fn();
const mockResend = jest.fn();
const mockSignIn = jest.fn();
const mockRpc = jest.fn();

jest.mock('expo-linking', () => ({ createURL: (ruta: string) => `newyou://${ruta}` }));
jest.mock('../services/supabase', () => ({
  supabase: {
    rpc: (...args: unknown[]) => mockRpc(...args),
    auth: {
      signUp: (...args: unknown[]) => mockSignUp(...args),
      resend: (...args: unknown[]) => mockResend(...args),
      signInWithPassword: (...args: unknown[]) => mockSignIn(...args),
    },
  },
}));

beforeEach(() => {
  mockRpc.mockReset().mockResolvedValue({ data: true, error: null });
  mockSignUp.mockReset();
  mockResend.mockReset().mockResolvedValue({ error: null });
  mockSignIn.mockReset();
});

describe('registro con confirmación de correo', () => {
  it('sin sesión pide confirmar y manda el enlace a la app', async () => {
    mockSignUp.mockResolvedValue({ data: { user: { identities: [{ id: '1' }] }, session: null }, error: null });
    const resultado = await signUpWithPassword(' ana@mail.com ', 'Clave123', 'ana', 'comprador');
    expect(resultado).toEqual({ error: null, necesitaConfirmar: true });
    expect(mockSignUp.mock.calls[0][0]).toMatchObject({
      email: 'ana@mail.com',
      options: { emailRedirectTo: 'newyou://confirmar-correo' },
    });
  });

  it('con la confirmación apagada entra directo', async () => {
    mockSignUp.mockResolvedValue({ data: { user: { identities: [{ id: '1' }] }, session: {} }, error: null });
    const resultado = await signUpWithPassword('ana@mail.com', 'Clave123', 'ana', 'comprador');
    expect(resultado.necesitaConfirmar).toBe(false);
  });

  it('avisa si el correo ya tiene cuenta (usuario sin identidades)', async () => {
    mockSignUp.mockResolvedValue({ data: { user: { identities: [] }, session: null }, error: null });
    const { error } = await signUpWithPassword('ana@mail.com', 'Clave123', 'ana', 'comprador');
    expect(error?.message).toMatch(/Ya existe una cuenta con ese correo/);
  });

  it('reenvía el correo de confirmación', async () => {
    const { error } = await reenviarConfirmacion('ana@mail.com');
    expect(error).toBeNull();
    expect(mockResend).toHaveBeenCalledWith({
      type: 'signup',
      email: 'ana@mail.com',
      options: { emailRedirectTo: 'newyou://confirmar-correo' },
    });
  });
});

describe('login sin confirmar', () => {
  it('devuelve el correo para ofrecer reenviar el enlace', async () => {
    mockSignIn.mockResolvedValue({ data: {}, error: { message: 'Email not confirmed', code: 'email_not_confirmed' } });
    const { correoSinConfirmar, error } = await signInWithPassword('ana@mail.com', 'Clave123');
    expect(correoSinConfirmar).toBe('ana@mail.com');
    expect(error?.message).toMatch(/confirmar tu correo/);
  });

  it('con contraseña incorrecta no lo ofrece', async () => {
    mockSignIn.mockResolvedValue({ data: {}, error: { message: 'Invalid login credentials' } });
    const { correoSinConfirmar } = await signInWithPassword('ana@mail.com', 'mal');
    expect(correoSinConfirmar).toBeNull();
  });
});
