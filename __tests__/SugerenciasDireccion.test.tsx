import { act, fireEvent, render, screen } from '@testing-library/react-native';

import { SugerenciasDireccion } from '../components/ui/SugerenciasDireccion';
import { recordarPunto, sugerirDirecciones } from '../services/locationService';

jest.mock('../services/locationService', () => ({
  sugerirDirecciones: jest.fn(),
  recordarPunto: jest.fn(),
}));

describe('SugerenciasDireccion (autocompletado)', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('sugiere direcciones mientras se escribe y carga la elegida', async () => {
    (sugerirDirecciones as jest.Mock).mockResolvedValue([
      { texto: 'Adolfo Alsina 3048, Manuel Alberti, Buenos Aires', latitud: -34.43, longitud: -58.8 },
    ]);
    const onElegir = jest.fn();
    await render(<SugerenciasDireccion texto="Adolfo Alsina 30" activo onElegir={onElegir} />);
    await act(async () => {
      jest.advanceTimersByTime(500);
    });

    await fireEvent.press(screen.getByText('Adolfo Alsina 3048, Manuel Alberti, Buenos Aires'));
    expect(onElegir).toHaveBeenCalledWith('Adolfo Alsina 3048, Manuel Alberti, Buenos Aires');
    expect(recordarPunto).toHaveBeenCalled();
  });

  it('no busca con menos de 4 letras ni cuando no se está escribiendo', async () => {
    (sugerirDirecciones as jest.Mock).mockClear();
    const { rerender } = await render(<SugerenciasDireccion texto="Adu" activo onElegir={jest.fn()} />);
    await rerender(<SugerenciasDireccion texto="Adolfo Alsina" activo={false} onElegir={jest.fn()} />);
    await act(async () => {
      jest.advanceTimersByTime(500);
    });
    expect(sugerirDirecciones).not.toHaveBeenCalled();
  });
});
