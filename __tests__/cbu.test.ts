import { aliasValido, cbuValido, enmascararCbu, lunesDeLaSemana, semanaALiquidar, textoSemana } from '../utils/cbu';

describe('cbuValido', () => {
  it('acepta un CBU con los dos dígitos verificadores bien', () => {
    expect(cbuValido('2850590940090418135201')).toBe(true);
    expect(cbuValido('2850 5909 4009 0418 1352 01')).toBe(true);
  });

  it('rechaza largo o dígitos verificadores incorrectos', () => {
    expect(cbuValido('285059094009041813520')).toBe(false);
    expect(cbuValido('2850590840090418135201')).toBe(false);
    expect(cbuValido('2850590940090418135202')).toBe(false);
  });
});

describe('aliasValido', () => {
  it('pide 6 a 20 caracteres sin espacios', () => {
    expect(aliasValido('mi.alias.mp')).toBe(true);
    expect(aliasValido('corto')).toBe(false);
    expect(aliasValido('con espacio')).toBe(false);
  });
});

describe('fechas de liquidación', () => {
  it('calcula el lunes de la semana', () => {
    expect(lunesDeLaSemana(new Date(2026, 10, 9))).toBe('2026-11-09'); // lunes
    expect(lunesDeLaSemana(new Date(2026, 10, 15))).toBe('2026-11-09'); // domingo
  });

  it('la semana a liquidar es la anterior', () => {
    expect(semanaALiquidar(new Date(2026, 10, 11))).toBe('2026-11-02');
    expect(textoSemana('2026-11-02')).toBe('02/11 al 08/11');
  });

  it('enmascara el CBU', () => {
    expect(enmascararCbu('2850590940090418135201')).toBe('•••• 5201');
    expect(enmascararCbu(null)).toBe('');
  });
});
