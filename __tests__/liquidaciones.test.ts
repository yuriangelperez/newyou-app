jest.mock('../services/supabase', () => ({ supabase: {} }));

import { Liquidacion, liquidacionesACsv } from '../services/liquidacionesService';

const liquidacion = (parcial: Partial<Liquidacion>): Liquidacion => ({
  id: 1,
  semanaInicio: '2026-11-02',
  beneficiario: 'Tienda',
  ventasOnline: 1000,
  comision: 100,
  comisionEfectivo: 0,
  cargos: 0,
  saldoAnterior: 0,
  neto: 900,
  pedidos: 1,
  estado: 'pendiente',
  motivoRetencion: null,
  titular: 'Ana "La" Pérez',
  cuit: '27111111110',
  cbu: '2850590940090418135201',
  alias: 'ana.pago',
  comprobante: null,
  pagadaAt: null,
  ...parcial,
});

describe('liquidacionesACsv', () => {
  it('exporta sólo las liquidaciones a pagar, con comillas escapadas y el monto con 2 decimales', () => {
    const csv = liquidacionesACsv([
      liquidacion({}),
      liquidacion({ id: 2, estado: 'pagada' }),
      liquidacion({ id: 3, estado: 'retenida' }),
    ]);
    const lineas = csv.split('\n');
    expect(lineas).toHaveLength(2);
    expect(lineas[0]).toBe('beneficiario,titular,cuit,cbu,alias,monto');
    expect(lineas[1]).toBe('"Tienda","Ana ""La"" Pérez","27111111110","2850590940090418135201","ana.pago","900.00"');
  });

  it('sin nada para pagar devuelve sólo el encabezado', () => {
    expect(liquidacionesACsv([liquidacion({ estado: 'saldo_negativo' })])).toBe('beneficiario,titular,cuit,cbu,alias,monto');
  });
});
