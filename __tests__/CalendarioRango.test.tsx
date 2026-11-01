import { fireEvent, render, screen } from '@testing-library/react-native';

import { CalendarioRango } from '../components/ui/CalendarioRango';

describe('CalendarioRango', () => {
  it('devuelve el día tocado y no deja elegir días futuros', async () => {
    const onElegir = jest.fn();
    await render(<CalendarioRango desde="2026-10-10" hasta="2026-10-20" maximo="2026-10-25" onElegir={onElegir} />);

    await fireEvent.press(screen.getByTestId('dia-2026-10-15'));
    expect(onElegir).toHaveBeenCalledWith('2026-10-15');

    await fireEvent.press(screen.getByTestId('dia-2026-10-28'));
    expect(onElegir).toHaveBeenCalledTimes(1);
  });

  it('cambia de mes', async () => {
    await render(<CalendarioRango desde="2026-10-10" hasta="2026-10-20" maximo="2026-11-05" onElegir={jest.fn()} />);
    expect(screen.getByText('Octubre 2026')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('calendario-siguiente'));
    expect(screen.getByText('Noviembre 2026')).toBeTruthy();
  });
});
