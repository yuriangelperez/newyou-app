import {
  calcularComision,
  cancelarPagoMp,
  crearPagoMp,
  esLinkExterno,
  esPagoOnline,
  medioPermitido,
  pagarConTarjeta,
  resultadoDeRetorno,
  simularPagoMp,
  tipoTarjeta,
  verificarPagoMp,
} from '../services/pagosService';

const mockInvoke = jest.fn();
jest.mock('../services/supabase', () => ({ supabase: { functions: { invoke: (...args: unknown[]) => mockInvoke(...args) } } }));

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

describe('medioPermitido', () => {
  it('el efectivo sólo se acepta con retiro en el local', () => {
    expect(medioPermitido('Efectivo', 'local')).toBe(true);
    expect(medioPermitido('Efectivo', 'domicilio')).toBe(false);
  });

  it('tarjetas y Mercado Pago se aceptan con cualquier entrega', () => {
    for (const medio of ['Tarjeta de crédito', 'Tarjeta de débito', 'Mercado Pago'] as const) {
      expect(medioPermitido(medio, 'domicilio')).toBe(true);
      expect(medioPermitido(medio, 'local')).toBe(true);
    }
  });
});

describe('esLinkExterno (WebView del Checkout Pro)', () => {
  it('deja pasar las páginas web de Mercado Pago', () => {
    expect(esLinkExterno('https://www.mercadopago.com.ar/checkout/v1/redirect?pref_id=1')).toBe(false);
    expect(esLinkExterno('about:blank')).toBe(false);
  });

  it('frena los links que abrirían la app de Mercado Pago', () => {
    expect(esLinkExterno('intent://checkout#Intent;scheme=mercadopago;package=com.mercadopago.wallet;end')).toBe(true);
    expect(esLinkExterno('mercadopago://checkout?pref_id=1')).toBe(true);
    expect(esLinkExterno('market://details?id=com.mercadopago.wallet')).toBe(true);
  });
});

describe('Mercado Pago simulado (versión demo)', () => {
  beforeEach(() => mockInvoke.mockReset());

  it('manda el resultado elegido a pago-mercadopago', async () => {
    mockInvoke.mockResolvedValue({ data: { estado: 'aprobado' }, error: null });

    await expect(simularPagoMp(15, 'aprobado')).resolves.toBe('aprobado');
    expect(mockInvoke).toHaveBeenCalledWith('pago-mercadopago', {
      body: { accion: 'simular', compraid: 15, resultado: 'aprobado' },
    });
  });

  it('un rechazo simulado anula la compra', async () => {
    mockInvoke.mockResolvedValue({ data: { estado: 'cancelado' }, error: null });

    await expect(simularPagoMp(15, 'rechazado')).resolves.toBe('cancelado');
  });

  it('muestra el motivo si la simulación está apagada en el servidor', async () => {
    mockInvoke.mockResolvedValue({
      data: null,
      error: { message: 'Edge Function returned a non-2xx status code', context: { json: async () => ({ error: 'El pago simulado está apagado' }) } },
    });

    await expect(simularPagoMp(15, 'aprobado')).rejects.toThrow('El pago simulado está apagado');
  });
});

describe('MP_MODO_DEMO', () => {
  const original = process.env.EXPO_PUBLIC_MP_MODO;
  afterEach(() => {
    if (original === undefined) delete process.env.EXPO_PUBLIC_MP_MODO;
    else process.env.EXPO_PUBLIC_MP_MODO = original;
  });

  it('sólo se activa con EXPO_PUBLIC_MP_MODO=demo', () => {
    process.env.EXPO_PUBLIC_MP_MODO = 'demo';
    jest.isolateModules(() => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      expect(require('../services/pagosService').MP_MODO_DEMO).toBe(true);
    });
    delete process.env.EXPO_PUBLIC_MP_MODO;
    jest.isolateModules(() => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      expect(require('../services/pagosService').MP_MODO_DEMO).toBe(false);
    });
  });
});
