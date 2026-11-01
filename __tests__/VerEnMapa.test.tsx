import { act, fireEvent, render, screen } from '@testing-library/react-native';

import { VerEnMapa } from '../components/ui/VerEnMapa';
import { buscarCoordenadas, direccionDeCoordenadas, recordarPunto } from '../services/locationService';

jest.mock('../services/locationService', () => ({
  buscarCoordenadas: jest.fn(),
  abrirDireccionEnMapa: jest.fn(),
  direccionDeCoordenadas: jest.fn(),
  recordarPunto: jest.fn(),
}));
// El mapa con pin real es un WebView: acá un botón simula que el usuario movió el pin.
jest.mock('../components/MapaPin', () => ({
  MapaPin: ({ onMover }: { onMover: (lat: number, lng: number) => void }) => {
    const { Pressable, Text: Texto } = jest.requireActual('react-native');
    return (
      <Pressable onPress={() => onMover(-34.43, -58.8)}>
        <Texto>mover pin</Texto>
      </Pressable>
    );
  },
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

  it('con pin: si la dirección no aparece, se marca en el mapa y se usa esa ubicación', async () => {
    buscar.mockResolvedValue(null);
    (direccionDeCoordenadas as jest.Mock).mockResolvedValue('Adolfo Alsina, Manuel Alberti');
    const onElegir = jest.fn();
    await render(<VerEnMapa direccion="Adolfo Alsina 3048, Manuel Alberti" onElegirDireccion={onElegir} />);
    await fireEvent.press(screen.getByText('Ver en el mapa'));
    await esperarBusqueda();

    expect(screen.getByText(/Marcala con el pin/)).toBeTruthy();
    await fireEvent.press(screen.getByText('mover pin'));
    expect(await screen.findByText('Pin en: Adolfo Alsina, Manuel Alberti')).toBeTruthy();

    await fireEvent.press(screen.getByTestId('mapa-usar-pin'));
    // El mapa no conoce la altura: queda lo escrito (con el 3048) y se guarda el punto marcado.
    expect(onElegir).toHaveBeenCalledWith('Adolfo Alsina 3048, Manuel Alberti');
    expect(recordarPunto).toHaveBeenCalledWith(
      'Adolfo Alsina 3048, Manuel Alberti',
      expect.objectContaining({ latitud: -34.43, longitud: -58.8 }),
    );
  });
});
