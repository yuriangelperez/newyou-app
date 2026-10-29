const mockInvoke = jest.fn();
jest.mock('../services/supabase', () => ({ supabase: { functions: { invoke: (...args: unknown[]) => mockInvoke(...args) } } }));

import {
  calcularComision,
  cancelarPagoMp,
  crearPagoMp,
  esPagoOnline,
  pagarConTarjeta,
  resultadoDeRetorno,
  tipoTarjeta,
  verificarPagoMp,
} from '../services/pagosService';

const RETORNO = 'https://proyecto.supabase.co/functions/v1/mp-webhook';

describe('esPagoOnline', () => {
  it('sólo tarjeta y Mercado Pago se cobran en línea', () => {
    expect(esPagoOnline('Tarjeta de crédito')).toBe(true);
    expect(esPagoOnline('Mercado Pago')).toBe(true);
    expect(esPagoOnline('Efectivo')).toBe(false);
    expect(esPagoOnline('Tarjeta de débito')).toBe(true);
  });
});

describe('resultadoDeRetorno', () => {
  it('ignora las páginas propias de Mercado Pago', () => {
    expect(resultadoDeRetorno('https://www.mercadopago.com.ar/checkout/v1/redirect?pref_id=1', RETORNO)).toBeNull();
  });

  it('lee cómo volvió el pago', () => {
    expect(resultadoDeRetorno(`${RETORNO}?retorno=aprobado&payment_id=9&status=approved`, RETORNO)).toBe('aprobado');
    expect(resultadoDeRetorno(`${RETORNO}?retorno=pendiente&status=in_process`, RETORNO)).toBe('pendiente');
    expect(resultadoDeRetorno(`${RETORNO}?retorno=rechazado&status=rejected`, RETORNO)).toBe('rechazado');
  });

  it('un regreso sin dato cuenta como no pagado', () => {
    expect(resultadoDeRetorno(`${RETORNO}?status=null`, RETORNO)).toBe('rechazado');
  });
});

describe('Edge Function pago-mercadopago', () => {
  beforeEach(() => mockInvoke.mockReset());

  it('crea el pago de la compra', async () => {
    mockInvoke.mockResolvedValue({ data: { url: 'https://mp/pagar', retorno: RETORNO }, error: null });

    await expect(crearPagoMp(15)).resolves.toEqual({ url: 'https://mp/pagar', retorno: RETORNO });
    expect(mockInvoke).toHaveBeenCalledWith('pago-mercadopago', { body: { accion: 'crear', compraid: 15 } });
  });

  it('devuelve el estado al verificar y al cancelar', async () => {
    mockInvoke.mockResolvedValueOnce({ data: { estado: 'aprobado' }, error: null });
    mockInvoke.mockResolvedValueOnce({ data: { estado: 'cancelado' }, error: null });

    await expect(verificarPagoMp(15)).resolves.toBe('aprobado');
    await expect(cancelarPagoMp(15)).resolves.toBe('cancelado');
  });

  it('muestra el motivo que manda la función', async () => {
    mockInvoke.mockResolvedValue({
      data: null,
      error: {
        message: 'Edge Function returned a non-2xx status code',
        context: { json: () => Promise.resolve({ error: 'Falta el secreto MP_ACCESS_TOKEN en Supabase' }) },
      },
    });

    await expect(crearPagoMp(15)).rejects.toThrow('Falta el secreto MP_ACCESS_TOKEN en Supabase');
  });
});

describe('tarjetas', () => {
  it('sólo el crédito suma comisión', () => {
    expect(calcularComision('Tarjeta de crédito', 10000)).toBe(600);
    expect(calcularComision('Tarjeta de crédito', 18990)).toBe(1139);
    expect(calcularComision('Tarjeta de débito', 10000)).toBe(0);
    expect(calcularComision('Mercado Pago', 10000)).toBe(0);
    expect(calcularComision('Efectivo', 10000)).toBe(0);
  });

  it('cada medio acepta su tipo de tarjeta', () => {
    expect(tipoTarjeta('Tarjeta de crédito')).toBe('credito');
    expect(tipoTarjeta('Tarjeta de débito')).toBe('debito');
    expect(tipoTarjeta('Mercado Pago')).toBeNull();
  });

  it('manda la tarjeta a la API propia (pago-tarjeta)', async () => {
    mockInvoke.mockReset();
    mockInvoke.mockResolvedValue({ data: { estado: 'rechazado', detalle: 'La tarjeta no tiene fondos suficientes.' }, error: null });
    const tarjeta = {
      numero: '4509953566233704',
      titular: 'FUND',
      vencimiento: '11/30',
      cvv: '123',
      dni: '12345678',
      cuotas: 3,
    };

    await expect(pagarConTarjeta(15, tarjeta)).resolves.toEqual({
      estado: 'rechazado',
      detalle: 'La tarjeta no tiene fondos suficientes.',
    });
    expect(mockInvoke).toHaveBeenCalledWith('pago-tarjeta', {
      body: { accion: 'pagar', compraid: 15, tarjeta },
    });
  });
});
