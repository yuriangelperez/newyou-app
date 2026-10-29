import * as copiaFuncion from '../supabase/functions/_shared/tarjeta';
import * as app from '../utils/tarjeta';
import {
  calcularCuotas,
  detectarMarca,
  detectarTipo,
  formatearNumero,
  formatearVencimiento,
  luhnValido,
  TARJETAS_PRUEBA,
  validarTarjeta,
  vencimientoValido,
} from '../utils/tarjeta';

const HOY = new Date(2026, 9, 28);
const VALIDA = {
  numero: '4509953566233704',
  titular: 'APRO',
  vencimiento: '11/30',
  cvv: '123',
  dni: '12345678',
  cuotas: 1,
};

describe('API de tarjetas: validación', () => {
  it('las tarjetas de prueba pasan Luhn y un dígito cambiado no', () => {
    TARJETAS_PRUEBA.forEach((tarjeta) => expect(luhnValido(tarjeta.numero)).toBe(true));
    expect(luhnValido('4509953566233705')).toBe(false);
    expect(luhnValido('1234')).toBe(false);
  });

  it('detecta marca y tipo', () => {
    expect(detectarMarca('4509 9535 6623 3704')).toBe('Visa');
    expect(detectarMarca('5031755734530604')).toBe('Mastercard');
    expect(detectarMarca('371180303257522')).toBe('American Express');
    expect(detectarMarca('9999999999999995')).toBeNull();
    expect(detectarTipo('4509953566233704')).toBe('credito');
    expect(detectarTipo('4002768694395619')).toBe('debito');
    expect(detectarTipo('5287338310253304')).toBe('debito');
  });

  it('el vencimiento tiene que ser futuro', () => {
    expect(vencimientoValido('11/30', HOY)).toBe(true);
    expect(vencimientoValido('09/26', HOY)).toBe(false);
    // Vence el último día del mes: octubre todavía sirve.
    expect(vencimientoValido('10/26', HOY)).toBe(true);
    expect(vencimientoValido('13/30', HOY)).toBe(false);
    expect(vencimientoValido('1130', HOY)).toBe(false);
  });

  it('formatea mientras se escribe', () => {
    expect(formatearNumero('4509953566233704')).toBe('4509 9535 6623 3704');
    expect(formatearNumero('371180303257522')).toBe('3711 803032 57522');
    expect(formatearVencimiento('1130')).toBe('11/30');
    expect(formatearVencimiento('1')).toBe('1');
  });

  it('una tarjeta completa no tiene errores', () => {
    expect(validarTarjeta(VALIDA, HOY)).toEqual({});
  });

  it('marca cada campo mal cargado', () => {
    const errores = validarTarjeta(
      { numero: '4509953566233705', titular: 'A', vencimiento: '01/20', cvv: '12', dni: '123', cuotas: 5 },
      HOY,
    );
    expect(Object.keys(errores).sort()).toEqual(['cuotas', 'cvv', 'dni', 'numero', 'titular', 'vencimiento']);
  });

  it('rechaza el tipo de tarjeta equivocado', () => {
    expect(validarTarjeta(VALIDA, HOY, 'credito')).toEqual({});
    expect(validarTarjeta(VALIDA, HOY, 'debito').numero).toMatch(/es de crédito/);
    expect(validarTarjeta({ ...VALIDA, numero: '4002768694395619' }, HOY, 'credito').numero).toMatch(/es de débito/);
  });

  it('American Express pide 4 dígitos de código', () => {
    const amex = { ...VALIDA, numero: '371180303257522' };
    expect(validarTarjeta(amex, HOY).cvv).toBe('El código tiene 4 dígitos');
    expect(validarTarjeta({ ...amex, cvv: '1234' }, HOY)).toEqual({});
  });

  it('las cuotas suman interés y 1 pago no', () => {
    expect(calcularCuotas(12000, 1)).toEqual({ interes: 0, total: 12000, valorCuota: 12000 });
    expect(calcularCuotas(12000, 3)).toEqual({ interes: 1200, total: 13200, valorCuota: 4400 });
    expect(calcularCuotas(12000, 12)).toEqual({ interes: 4800, total: 16800, valorCuota: 1400 });
  });

  it('la Edge Function usa la misma validación', () => {
    // supabase/functions/_shared/tarjeta.ts tiene que ser copia de utils/tarjeta.ts. Se compara el
    // comportamiento (no el texto del código: con --coverage Jest instrumenta cada archivo distinto).
    expect(copiaFuncion.INTERES_CUOTAS).toEqual(app.INTERES_CUOTAS);
    expect(copiaFuncion.TARJETAS_PRUEBA).toEqual(app.TARJETAS_PRUEBA);

    const casos = [
      ...app.TARJETAS_PRUEBA.map((tarjeta) => ({ ...VALIDA, numero: tarjeta.numero })),
      { ...VALIDA, numero: '4509953566233705' },
      { ...VALIDA, numero: '371180303257522', cvv: '1234', cuotas: 12 },
      { numero: '9999', titular: 'A', vencimiento: '01/20', cvv: '1', dni: '1', cuotas: 5 },
    ];
    casos.forEach((datos) => {
      expect(copiaFuncion.detectarMarca(datos.numero)).toBe(app.detectarMarca(datos.numero));
      expect(copiaFuncion.detectarTipo(datos.numero)).toBe(app.detectarTipo(datos.numero));
      expect(copiaFuncion.formatearNumero(datos.numero)).toBe(app.formatearNumero(datos.numero));
      (['credito', 'debito', undefined] as const).forEach((tipo) => {
        expect(copiaFuncion.validarTarjeta(datos, HOY, tipo)).toEqual(app.validarTarjeta(datos, HOY, tipo));
      });
    });
    [1, 3, 6, 12].forEach((cuotas) => {
      expect(copiaFuncion.calcularCuotas(9434, cuotas)).toEqual(app.calcularCuotas(9434, cuotas));
    });
  });
});
