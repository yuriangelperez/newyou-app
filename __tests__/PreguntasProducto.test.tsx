import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { PreguntasProducto } from '../components/PreguntasProducto';
import { hacerPregunta, listarPreguntas, responderPregunta } from '../services/preguntasService';

jest.mock('../services/preguntasService', () => ({
  listarPreguntas: jest.fn(),
  hacerPregunta: jest.fn(),
  responderPregunta: jest.fn(),
  ocultarPregunta: jest.fn(),
}));

const base = {
  productoId: 7,
  autorId: 'u1',
  respuesta: null,
  respondidaAt: null,
  oculta: false,
  createdAt: '2026-11-09T12:00:00Z',
};

describe('PreguntasProducto', () => {
  beforeEach(() => jest.clearAllMocks());

  it('muestra las preguntas con su respuesta', async () => {
    (listarPreguntas as jest.Mock).mockResolvedValue([
      { ...base, id: 1, texto: '¿Tenés talle M?', respuesta: 'Sí, hay M', respondidaAt: base.createdAt },
    ]);
    await render(<PreguntasProducto productoId="7" puedeResponder={false} />);
    expect(await screen.findByText('¿Tenés talle M?')).toBeTruthy();
    expect(screen.getByText(/Sí, hay M/)).toBeTruthy();
  });

  it('no envía preguntas con teléfono o mail', async () => {
    (listarPreguntas as jest.Mock).mockResolvedValue([]);
    await render(<PreguntasProducto productoId="7" puedeResponder={false} />);
    await fireEvent.changeText(await screen.findByTestId('preguntas-input'), 'llamame al 1123456789');
    await fireEvent.press(screen.getByTestId('preguntas-enviar'));
    expect(await screen.findByText(/no se pueden compartir teléfonos/)).toBeTruthy();
    expect(hacerPregunta).not.toHaveBeenCalled();
  });

  it('envía una pregunta válida y la agrega arriba', async () => {
    (listarPreguntas as jest.Mock).mockResolvedValue([]);
    (hacerPregunta as jest.Mock).mockResolvedValue({ ...base, id: 2, texto: '¿Cuánto mide de largo?' });
    await render(<PreguntasProducto productoId="7" puedeResponder={false} />);
    await fireEvent.changeText(await screen.findByTestId('preguntas-input'), '¿Cuánto mide de largo?');
    await fireEvent.press(screen.getByTestId('preguntas-enviar'));
    await waitFor(() => expect(hacerPregunta).toHaveBeenCalledWith('7', '¿Cuánto mide de largo?'));
    expect(await screen.findByText('¿Cuánto mide de largo?')).toBeTruthy();
  });

  it('el vendedor responde en lugar de preguntar', async () => {
    (listarPreguntas as jest.Mock).mockResolvedValue([{ ...base, id: 3, texto: '¿Envían a Pilar?' }]);
    (responderPregunta as jest.Mock).mockResolvedValue({
      ...base,
      id: 3,
      texto: '¿Envían a Pilar?',
      respuesta: 'Sí',
      respondidaAt: base.createdAt,
    });
    await render(<PreguntasProducto productoId="7" puedeResponder />);
    expect(screen.queryByTestId('preguntas-input')).toBeNull();
    await fireEvent.changeText(await screen.findByTestId('responder-input-3'), 'Sí');
    await fireEvent.press(screen.getByTestId('responder-enviar-3'));
    await waitFor(() => expect(responderPregunta).toHaveBeenCalledWith(3, 'Sí'));
    expect(await screen.findByText(/↳ Sí/)).toBeTruthy();
  });
});
