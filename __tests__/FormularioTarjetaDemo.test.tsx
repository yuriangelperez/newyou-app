import { fireEvent, render, screen } from '@testing-library/react-native';

import { FormularioTarjeta } from '../components/FormularioTarjeta';

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));
// Versión demo: el formulario sólo ofrece tarjetas de prueba con los datos fijos.
jest.mock('../constants/demo', () => ({ MP_MODO_DEMO: true }));

async function renderFormulario(tipo: 'credito' | 'debito' = 'credito') {
  const onPagar = jest.fn().mockResolvedValue(null);
  await render(
    <FormularioTarjeta visible monto={12000} tipo={tipo} procesando={false} onPagar={onPagar} onCancelar={jest.fn()} />,
  );
  return { onPagar };
}

describe('FormularioTarjeta en la versión demo', () => {
  it('avisa que no se use una tarjeta real y no deja editar los datos', async () => {
    await renderFormulario();

    expect(screen.getByText(/No uses una\s+tarjeta real/)).toBeTruthy();
    for (const campo of ['numero', 'titular', 'vencimiento', 'cvv', 'dni']) {
      expect(screen.getByTestId(`tarjeta-${campo}`).props.editable).toBe(false);
    }
    expect(screen.queryByText('Ver tarjetas de prueba')).toBeNull();
  });

  it('paga con la tarjeta de prueba cargada', async () => {
    const { onPagar } = await renderFormulario();

    await fireEvent.press(screen.getByTestId('tarjeta-pagar'));

    expect(onPagar).toHaveBeenCalledWith({
      numero: '4509953566233704',
      titular: 'APRO',
      vencimiento: '11/30',
      cvv: '123',
      dni: '12345678',
      cuotas: 1,
    });
  });

  it('se puede elegir otra tarjeta de prueba y el resultado', async () => {
    const { onPagar } = await renderFormulario();

    await fireEvent.press(screen.getByTestId('tarjeta-demo-7522'));
    await fireEvent.press(screen.getByTestId('tarjeta-demo-resultado-FUND'));
    await fireEvent.press(screen.getByTestId('tarjeta-pagar'));

    // American Express lleva código de 4 dígitos.
    expect(onPagar).toHaveBeenCalledWith(
      expect.objectContaining({ numero: '371180303257522', titular: 'FUND', cvv: '1234' }),
    );
  });

  it('en débito sólo ofrece tarjetas de débito', async () => {
    await renderFormulario('debito');

    expect(screen.getByTestId('tarjeta-demo-5619')).toBeTruthy();
    expect(screen.getByTestId('tarjeta-demo-3304')).toBeTruthy();
    expect(screen.queryByTestId('tarjeta-demo-3704')).toBeNull();
  });
});
