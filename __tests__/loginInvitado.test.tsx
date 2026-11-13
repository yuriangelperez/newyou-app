import { fireEvent, render, screen } from '@testing-library/react-native';

import LoginScreen from '../app/(auth)/login';

const mockReplace = jest.fn();
const mockSignIn = jest.fn();

jest.mock('expo-router', () => ({ useRouter: () => ({ replace: mockReplace, push: jest.fn() }) }));
jest.mock('../services/auth', () => ({ signInWithPassword: (...args: unknown[]) => mockSignIn(...args) }));
jest.mock('../services/empresasService', () => ({ obtenerMisEmpresas: jest.fn().mockResolvedValue([]) }));
jest.mock('../services/bienvenidaService', () => ({
  bienvenidaVista: jest.fn().mockResolvedValue(true),
  marcarBienvenidaVista: jest.fn(),
}));
jest.mock('../components/TarjetaBienvenida', () => ({ TarjetaBienvenida: () => null }));
jest.mock('../constants/demo', () => ({
  INVITADO_DISPONIBLE: true,
  CUENTAS_INVITADO: [
    { tipo: 'comprador', etiqueta: 'Comprador', detalle: 'd', correo: 'comprador@demo.test', contrasena: 'clave-1' },
    { tipo: 'empresa', etiqueta: 'Empresa', detalle: 'd', correo: 'empresa@demo.test', contrasena: 'clave-2' },
  ],
}));

describe('Login: entrar como invitado (versión demo)', () => {
  beforeEach(() => {
    mockReplace.mockReset();
    mockSignIn.mockReset();
  });

  it('deja elegir cómo entrar y usa la cuenta elegida', async () => {
    mockSignIn.mockResolvedValue({ error: null, quiereCrearEmpresa: false, correoSinConfirmar: null });
    await render(<LoginScreen />);

    await fireEvent.press(screen.getByTestId('login-invitado'));
    expect(screen.getByText('¿Cómo querés probar New You?')).toBeTruthy();
    // Sólo se ofrecen las cuentas configuradas.
    expect(screen.queryByTestId('login-invitado-particular')).toBeNull();

    await fireEvent.press(screen.getByTestId('login-invitado-empresa'));

    expect(mockSignIn).toHaveBeenCalledWith('empresa@demo.test', 'clave-2');
    expect(mockReplace).toHaveBeenCalledWith(expect.anything());
  });

  it('si la cuenta falla avisa y se queda en el login', async () => {
    mockSignIn.mockResolvedValue({ error: new Error('x'), quiereCrearEmpresa: false, correoSinConfirmar: null });
    await render(<LoginScreen />);

    await fireEvent.press(screen.getByTestId('login-invitado'));
    await fireEvent.press(screen.getByTestId('login-invitado-comprador'));

    expect(await screen.findByText('No se pudo entrar como invitado. Probá registrarte.')).toBeTruthy();
    expect(mockReplace).not.toHaveBeenCalled();
  });
});
