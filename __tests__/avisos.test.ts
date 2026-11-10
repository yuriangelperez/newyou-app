import { ROUTES } from '../constants/routes';
import { Aviso, contextoAviso, destinoAviso } from '../services/avisosService';

jest.mock('../services/supabase', () => ({ supabase: {} }));

const aviso = (datos: Aviso['datos'], cuerpo = ''): Aviso => ({
  id: 1,
  titulo: 't',
  cuerpo,
  datos,
  leida: false,
  createdAt: '2026-11-09T12:00:00Z',
});

describe('destinoAviso', () => {
  it('un mensaje abre el chat del pedido', () => {
    expect(destinoAviso({ tipo: 'chat', pedidoId: 12 })).toEqual({ pathname: ROUTES.orderChat, params: { id: '12' } });
  });

  it('una pregunta abre la prenda', () => {
    expect(destinoAviso({ tipo: 'pregunta', productoId: 7 })).toEqual({
      pathname: ROUTES.productDetail,
      params: { id: '7' },
    });
  });

  it('ventas, compras y liquidaciones van a su pantalla', () => {
    expect(destinoAviso({ tipo: 'venta', pedidoId: 1 })).toBe(ROUTES.mySales);
    expect(destinoAviso({ tipo: 'compra', pedidoId: 1 })).toBe(ROUTES.myPurchases);
    expect(destinoAviso({ tipo: 'liquidacion' })).toBe(ROUTES.myPayouts);
    expect(destinoAviso({})).toBeNull();
  });
});

describe('contextoAviso', () => {
  it('muestra la pregunta completa', () => {
    expect(contextoAviso(aviso({ tipo: 'pregunta', pregunta: '¿Tiene manchas?', producto: 'Campera' }))).toBe(
      '"¿Tiene manchas?"',
    );
  });

  it('muestra pregunta y respuesta', () => {
    expect(contextoAviso(aviso({ tipo: 'respuesta', pregunta: '¿Talle?', respuesta: 'M' }))).toBe(
      'Preguntaste: "¿Talle?"\nRespuesta: "M"',
    );
  });

  it('en un mensaje muestra qué se compró', () => {
    expect(contextoAviso(aviso({ tipo: 'chat', pedidoId: 5, detalle: '1 × Remera, 2 × Jean' }))).toBe(
      'Pedido #5 · 1 × Remera, 2 × Jean',
    );
  });
});
