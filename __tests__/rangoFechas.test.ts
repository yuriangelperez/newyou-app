import { diasDelRango, etiquetaRango, rangoPredefinido, validarRango } from '../utils/rangoFechas';

// Lunes 27 de octubre de 2026, a la tarde.
const HOY = new Date(2026, 9, 27, 18, 30);

describe('rangoPredefinido', () => {
  it('Hoy va de hoy a hoy', () => {
    expect(rangoPredefinido('hoy', HOY)).toEqual({ desde: '2026-10-27', hasta: '2026-10-27' });
  });

  it('Esta semana arranca el lunes', () => {
    expect(rangoPredefinido('semana', HOY)).toEqual({ desde: '2026-10-26', hasta: '2026-10-27' });
    // Un domingo cuenta la semana que empezó el lunes anterior.
    expect(rangoPredefinido('semana', new Date(2026, 10, 1))).toEqual({ desde: '2026-10-26', hasta: '2026-11-01' });
  });

  it('Este mes arranca el día 1', () => {
    const rango = rangoPredefinido('mes', HOY);
    expect(rango).toEqual({ desde: '2026-10-01', hasta: '2026-10-27' });
    expect(diasDelRango(rango)).toBe(27);
  });
});

describe('validarRango (personalizado)', () => {
  it('acepta un rango válido en DD/MM/AAAA', () => {
    expect(validarRango('1/9/2026', '30/09/2026', HOY)).toEqual({ ok: true, desde: '2026-09-01', hasta: '2026-09-30' });
  });

  it('rechaza fechas vacías, mal escritas o que no existen', () => {
    expect(validarRango('', '27/10/2026', HOY)).toEqual({ ok: false, mensaje: 'Ingresá la fecha desde.' });
    expect(validarRango('2026-10-01', '27/10/2026', HOY)).toEqual({
      ok: false,
      mensaje: 'La fecha desde tiene que tener el formato DD/MM/AAAA.',
    });
    expect(validarRango('01/10/2026', '31/09/2026', HOY)).toEqual({ ok: false, mensaje: 'La fecha hasta no existe.' });
  });

  it('rechaza el futuro, el orden invertido y más de un año', () => {
    expect(validarRango('01/10/2026', '28/10/2026', HOY)).toEqual({
      ok: false,
      mensaje: 'La fecha hasta no puede ser posterior a hoy.',
    });
    expect(validarRango('20/10/2026', '10/10/2026', HOY)).toEqual({
      ok: false,
      mensaje: 'La fecha desde tiene que ser anterior o igual a la fecha hasta.',
    });
    expect(validarRango('01/01/2025', '27/10/2026', HOY)).toEqual({ ok: false, mensaje: 'El rango puede ser de hasta un año.' });
  });
});

describe('etiquetaRango', () => {
  it('muestra un día o el rango completo', () => {
    expect(etiquetaRango({ desde: '2026-10-27', hasta: '2026-10-27' })).toBe('27/10/2026');
    expect(etiquetaRango({ desde: '2026-10-01', hasta: '2026-10-27' })).toBe('01/10/2026 al 27/10/2026');
  });
});
