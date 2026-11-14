import { fireEvent, render, screen } from '@testing-library/react-native';

import LoginScreen from '../app/(auth)/login';
import InvitadoScreen from '../app/(auth)/invitado';

const mockReplace = jest.fn();
const mockPush = jest.fn();
const mockSignIn = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({ replace: mockReplace, push: mockPush, back: jest.fn(), canGoBack: () => true }),
  Redirect: () => null,
}));
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }));
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

describe('Entrar como invitado (versión demo)', () => {
  beforeEach(() => {
    mockReplace.mockReset();
    mockPush.mockReset();
    mockSignIn.mockReset();
  });

  it('el botón del login abre la pantalla para elegir, sin cambiar el login', async () => {
    await render(<LoginScreen />);
    await fireEvent.press(screen.getByTestId('login-invitado'));
    expect(mockPush).toHaveBeenCalledWith('/invitado');
    expect(screen.queryByText('¿Cómo querés probar New You?')).toBeNull();
  });

  it('deja elegir cómo entrar y usa la cuenta elegida', async () => {
    mockSignIn.mockResolvedValue({ error: null, quiereCrearEmpresa: false, correoSinConfirmar: null });
    await render(<InvitadoScreen />);

    expect(screen.getByText('¿Cómo querés probar New You?')).toBeTruthy();
    // Sólo se ofrecen las cuentas configuradas.
    expect(screen.queryByTestId('invitado-particular')).toBeNull();

    await fireEvent.press(screen.getByTestId('invitado-empresa'));

    expect(mockSignIn).toHaveBeenCalledWith('empresa@demo.test', 'clave-2');
    expect(mockReplace).toHaveBeenCalledWith('/(tabs)');
  });

  it('si la cuenta falla avisa y se queda en la pantalla', async () => {
    mockSignIn.mockResolvedValue({ error: new Error('x'), quiereCrearEmpresa: false, correoSinConfirmar: null });
    await render(<InvitadoScreen />);

    await fireEvent.press(screen.getByTestId('invitado-comprador'));

    expect(await screen.findByTestId('invitado-error')).toBeTruthy();
    expect(mockReplace).not.toHaveBeenCalled();
  });
});
