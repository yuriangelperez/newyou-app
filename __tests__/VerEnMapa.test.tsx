import { act, fireEvent, render, screen } from '@testing-library/react-native';

import { VerEnMapa } from '../components/ui/VerEnMapa';
import { buscarCoordenadas } from '../services/locationService';

jest.mock('../services/locationService', () => ({
  buscarCoordenadas: jest.fn(),
  abrirDireccionEnMapa: jest.fn(),
}));
jest.mock('../components/MapaItem', () => ({
  MapaItem: ({ latitud }: { latitud: number }) => {
    const { Text: Texto } = jest.requireActual('react-native');
    return <Texto>{`mapa ${latitud}`}</Texto>;
  },
}));

const buscar = buscarCoordenadas as jest.Mock;

async function esperarBusqueda() {
  await act(async () => {
    jest.advanceTimersByTime(800);
  });
}

describe('VerEnMapa', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    buscar.mockReset();
  });
  afterEach(() => jest.useRealTimers());

  it('actualiza el mapa al corregir la dirección', async () => {
    buscar.mockResolvedValueOnce({ latitud: 1, longitud: 1 }).mockResolvedValueOnce({ latitud: 2, longitud: 2 });
    const { rerender } = await render(<VerEnMapa direccion="San Ignacio 600" />);

    await fireEvent.press(screen.getByText('Ver en el mapa'));
    await esperarBusqueda();
    expect(screen.getByText('mapa 1')).toBeTruthy();

    await rerender(<VerEnMapa direccion="San Ignacio 663" />);
    await esperarBusqueda();
    expect(buscar).toHaveBeenLastCalledWith('San Ignacio 663');
    expect(screen.getByText('mapa 2')).toBeTruthy();
  });

  it('Enter en el campo (pedido nuevo) abre el mapa', async () => {
    buscar.mockResolvedValue({ latitud: 3, longitud: 3 });
    const { rerender } = await render(<VerEnMapa direccion="Pilar" pedido={0} />);
    expect(screen.queryByText('mapa 3')).toBeNull();

    await rerender(<VerEnMapa direccion="Pilar" pedido={1} />);
    await esperarBusqueda();
    expect(screen.getByText('mapa 3')).toBeTruthy();
  });
});
