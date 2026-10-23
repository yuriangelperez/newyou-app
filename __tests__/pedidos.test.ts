jest.mock('../services/supabase', () => ({ supabase: {} }));

import { calcularEnvio, TiendaRetiro } from '../services/comprasService';
import { mapPedido, pedidoActivo, sePuedeCancelar, siguienteEstado } from '../services/pedidosService';

describe('siguienteEstado', () => {
  it('sigue el circuito de retiro en el local', () => {
    expect(siguienteEstado({ estado: 'pendiente', entrega: 'local' })).toBe('confirmado');
    expect(siguienteEstado({ estado: 'confirmado', entrega: 'local' })).toBe('preparando');
    expect(siguienteEstado({ estado: 'preparando', entrega: 'local' })).toBe('listo_para_retirar');
    expect(siguienteEstado({ estado: 'listo_para_retirar', entrega: 'local' })).toBe('entregado');
  });

  it('con envío a domicilio pasa por enviado', () => {
    expect(siguienteEstado({ estado: 'preparando', entrega: 'domicilio' })).toBe('enviado');
    expect(siguienteEstado({ estado: 'enviado', entrega: 'domicilio' })).toBe('entregado');
  });

  it('entregado y cancelado son finales', () => {
    expect(siguienteEstado({ estado: 'entregado', entrega: 'local' })).toBeNull();
    expect(siguienteEstado({ estado: 'cancelado', entrega: 'domicilio' })).toBeNull();
    expect(pedidoActivo('entregado')).toBe(false);
    expect(pedidoActivo('preparando')).toBe(true);
  });

  it('sólo se cancela antes de salir', () => {
    expect(sePuedeCancelar('pendiente')).toBe(true);
    expect(sePuedeCancelar('preparando')).toBe(true);
    expect(sePuedeCancelar('enviado')).toBe(false);
    expect(sePuedeCancelar('listo_para_retirar')).toBe(false);
  });
});

describe('calcularEnvio', () => {
  const tienda = (productoId: string, sedeId: number | null, costoEnvio: number): TiendaRetiro => ({
    productoId,
    vendedor: 'x',
    direccion: null,
    sedeId,
    haceRetiro: true,
    haceEnvio: true,
    costoEnvio,
  });

  it('suma el costo una vez por sede y los particulares no cobran', () => {
    const tiendas = [tienda('1', 10, 1500), tienda('2', 10, 1500), tienda('3', 11, 800), tienda('4', null, 0)];
    expect(calcularEnvio('domicilio', tiendas)).toBe(2300);
  });

  it('retiro en el local es gratis', () => {
    expect(calcularEnvio('local', [tienda('1', 10, 1500)])).toBe(0);
  });
});

describe('mapPedido', () => {
  it('convierte montos a número', () => {
    const pedido = mapPedido({
      id: 1,
      compra_id: 2,
      numero_orden: 3,
      created_at: '2026-10-23T10:00:00Z',
      estado: 'pendiente',
      entrega: 'domicilio',
      metodo_pago: 'Efectivo',
      direccion_entrega: 'Calle 1',
      subtotal: '2400',
      envio: '1500',
      total: '3900',
      empresa_id: 1,
      sede_id: 2,
      vendedor: 'Moda (Pilar)',
      comprador: 'ana',
      items: [{ productoId: 5, nombre: 'Remera', precio: '1200' as unknown as number, cantidad: 2 }],
      eventos: [],
    });
    expect(pedido.total).toBe(3900);
    expect(pedido.items[0].precio).toBe(1200);
  });
});
