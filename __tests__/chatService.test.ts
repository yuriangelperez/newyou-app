import { agregarMensaje, MensajePedido } from '../services/chatService';

jest.mock('../services/supabase', () => ({ supabase: {} }));

const mensaje = (id: number, createdAt: string): MensajePedido => ({
  id,
  pedidoId: 1,
  autorId: 'u1',
  texto: `m${id}`,
  sistema: false,
  createdAt,
});

describe('agregarMensaje', () => {
  it('no duplica un mensaje que llega por el envío y por Realtime', () => {
    const lista = [mensaje(1, '2026-11-09T10:00:00Z')];
    expect(agregarMensaje(lista, mensaje(1, '2026-11-09T10:00:00Z'))).toBe(lista);
  });

  it('mantiene el orden por fecha', () => {
    const lista = [mensaje(1, '2026-11-09T10:00:00Z'), mensaje(3, '2026-11-09T10:05:00Z')];
    const resultado = agregarMensaje(lista, mensaje(2, '2026-11-09T10:02:00Z'));
    expect(resultado.map((m) => m.id)).toEqual([1, 2, 3]);
  });
});
