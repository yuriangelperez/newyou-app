import { render, screen, waitFor } from '@testing-library/react-native';

import LoginScreen from '../app/(auth)/login';

const mockVista = jest.fn();

jest.mock('expo-router', () => ({ useRouter: () => ({ replace: jest.fn(), push: jest.fn() }) }));
jest.mock('../services/auth', () => ({ signInWithPassword: jest.fn() }));
jest.mock('../services/empresasService', () => ({ obtenerMisEmpresas: jest.fn().mockResolvedValue([]) }));
jest.mock('../services/bienvenidaService', () => ({
  bienvenidaVista: () => mockVista(),
  marcarBienvenidaVista: jest.fn(),
}));
jest.mock('../components/TarjetaBienvenida', () => ({
  TarjetaBienvenida: ({ visible }: { visible: boolean }) => {
    const { Text: MockText } = jest.requireActual('react-native');
    return visible ? <MockText>tarjeta-bienvenida</MockText> : null;
  },
}));

describe('Login: tarjeta "¿Qué es New You?"', () => {
  it('sale la primera vez que se abre la app', async () => {
    mockVista.mockResolvedValue(false);
    await render(<LoginScreen />);
    await waitFor(() => expect(screen.getByText('tarjeta-bienvenida')).toBeTruthy());
  });

  it('no vuelve a salir si ya se vio', async () => {
    mockVista.mockResolvedValue(true);
    await render(<LoginScreen />);
    await waitFor(() => expect(mockVista).toHaveBeenCalled());
    expect(screen.queryByText('tarjeta-bienvenida')).toBeNull();
  });
});
