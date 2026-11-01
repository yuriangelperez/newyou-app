import { fireEvent, render, screen } from '@testing-library/react-native';

import { FiltroPrecio } from '../components/ui/FiltroPrecio';

describe('FiltroPrecio', () => {
  it('aplica un atajo y un rango escrito a mano', async () => {
    const onCambiar = jest.fn();
    await render(<FiltroPrecio min={null} max={null} onCambiar={onCambiar} />);

    await fireEvent.press(screen.getByTestId('precio-$20.000 a $50.000'));
    expect(onCambiar).toHaveBeenLastCalledWith(20000, 50000);

    await fireEvent.changeText(screen.getByTestId('precio-min'), '15.000');
    expect(onCambiar).toHaveBeenLastCalledWith(15000, null);
  });

  it('avisa si el mínimo supera al máximo', async () => {
    await render(<FiltroPrecio min={50000} max={10000} onCambiar={jest.fn()} />);
    expect(screen.getByText(/mínimo es mayor/)).toBeTruthy();
  });
});
