import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { FormularioTarjeta } from '../components/FormularioTarjeta';

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));

async function renderFormulario(tipo: 'credito' | 'debito' = 'credito') {
  const onPagar = jest.fn().mockResolvedValue(null);
  const onCancelar = jest.fn();
  await render(
    <FormularioTarjeta visible monto={12000} tipo={tipo} procesando={false} onPagar={onPagar} onCancelar={onCancelar} />,
  );
  return { onPagar, onCancelar };
}

async function completar(numero = '4509953566233704') {
  await fireEvent.changeText(screen.getByTestId('tarjeta-numero'), numero);
  await fireEvent.changeText(screen.getByTestId('tarjeta-titular'), 'APRO');
  await fireEvent.changeText(screen.getByTestId('tarjeta-vencimiento'), '1130');
  await fireEvent.changeText(screen.getByTestId('tarjeta-cvv'), '123');
  await fireEvent.changeText(screen.getByTestId('tarjeta-dni'), '12345678');
}

describe('FormularioTarjeta', () => {
  it('no paga con datos inválidos y muestra los errores', async () => {
    const { onPagar } = await renderFormulario();

    await fireEvent.press(screen.getByTestId('tarjeta-pagar'));

    expect(await screen.findByText('El número de tarjeta no es válido')).toBeTruthy();
    expect(screen.getByText('El DNI tiene 7 u 8 números')).toBeTruthy();
    expect(onPagar).not.toHaveBeenCalled();
  });

  it('formatea el número y paga en las cuotas elegidas', async () => {
    const { onPagar } = await renderFormulario();
    await completar();
    await fireEvent.press(screen.getByTestId('tarjeta-cuotas-6'));

    expect(screen.getAllByText('4509 9535 6623 3704').length).toBeGreaterThan(0);
    // 6 cuotas: 12.000 + 20% de interés.
    expect(screen.getByText('PAGAR $14.400')).toBeTruthy();
    expect(screen.getByText('$2.400')).toBeTruthy();

    await fireEvent.press(screen.getByTestId('tarjeta-pagar'));
    await waitFor(() =>
      expect(onPagar).toHaveBeenCalledWith({
        numero: '4509953566233704',
        titular: 'APRO',
        vencimiento: '11/30',
        cvv: '123',
        dni: '12345678',
        cuotas: 6,
      }),
    );
  });

  it('débito no ofrece cuotas', async () => {
    await renderFormulario('debito');
    expect(screen.queryByTestId('tarjeta-cuotas-3')).toBeNull();
  });

  it('avisa al instante si la tarjeta no es del tipo elegido', async () => {
    const { onPagar } = await renderFormulario('credito');
    await completar('4002768694395619');

    expect(screen.getByText(/Esta tarjeta es de débito/)).toBeTruthy();
    await fireEvent.press(screen.getByTestId('tarjeta-pagar'));
    expect(onPagar).not.toHaveBeenCalled();
  });

  it('en débito no acepta una de crédito', async () => {
    await renderFormulario('debito');
    await completar('4509953566233704');
    expect(screen.getByText(/Esta tarjeta es de crédito/)).toBeTruthy();
  });

  it('muestra el motivo del rechazo dentro del formulario', async () => {
    const { onPagar } = await renderFormulario();
    onPagar.mockResolvedValue('La tarjeta no tiene fondos suficientes.');
    await completar();
    await fireEvent.press(screen.getByTestId('tarjeta-pagar'));

    expect(await screen.findByText('La tarjeta no tiene fondos suficientes.')).toBeTruthy();
    expect(screen.queryByText(/El código tiene/)).toBeNull();
  });
});
