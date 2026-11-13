import { act, fireEvent, render, screen } from '@testing-library/react-native';

import { PagoMercadoPagoDemo } from '../components/PagoMercadoPagoDemo';

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));

describe('PagoMercadoPagoDemo (Mercado Pago simulado)', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  const montar = async (onResultado = jest.fn()) => {
    await render(<PagoMercadoPagoDemo visible total={8900} orden={33} procesando={false} onResultado={onResultado} />);
    return onResultado;
  };

  it('muestra la orden, el total y que es un pago simulado', async () => {
    await montar();
    expect(screen.getByText('Orden #33')).toBeTruthy();
    expect(screen.getByTestId('pago-demo-total')).toHaveTextContent(/8\.?900/);
    expect(screen.getByText(/PAGO SIMULADO/)).toBeTruthy();
  });

  it('pagar aprueba después de "Procesando el pago..."', async () => {
    const onResultado = await montar();
    await fireEvent.press(screen.getByTestId('pago-demo-pagar'));

    expect(screen.getByText('Procesando el pago...')).toBeTruthy();
    expect(onResultado).not.toHaveBeenCalled();

    await act(() => jest.advanceTimersByTime(1200));
    expect(onResultado).toHaveBeenCalledWith('aprobado');
  });

  it('se puede simular un rechazo', async () => {
    const onResultado = await montar();
    await fireEvent.press(screen.getByTestId('pago-demo-rechazar'));
    await act(() => jest.advanceTimersByTime(1200));
    expect(onResultado).toHaveBeenCalledWith('rechazado');
  });

  it('cancelar avisa al instante', async () => {
    const onResultado = await montar();
    await fireEvent.press(screen.getByTestId('pago-demo-cancelar'));
    expect(onResultado).toHaveBeenCalledWith('cancelado');
  });

  it('no deja pagar dos veces mientras procesa', async () => {
    const onResultado = await montar();
    await fireEvent.press(screen.getByTestId('pago-demo-pagar'));
    await fireEvent.press(screen.getByTestId('pago-demo-pagar'));
    await act(() => jest.advanceTimersByTime(1200));
    expect(onResultado).toHaveBeenCalledTimes(1);
  });
});
