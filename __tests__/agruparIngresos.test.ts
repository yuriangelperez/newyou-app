import { agrupacionDelPeriodo, agruparIngresos, barrasPorHora, rangoPredefinido } from '../utils/rangoFechas';

const dias = [
  { dia: '2026-09-30', ingresos: 100 }, // miércoles
  { dia: '2026-10-01', ingresos: 50 },
  { dia: '2026-10-04', ingresos: 25 }, // domingo: sigue en la semana del 28/09
  { dia: '2026-10-05', ingresos: 10 }, // lunes siguiente
];

describe('agruparIngresos', () => {
  it('por día pone el día de la semana cuando son pocos', () => {
    expect(agruparIngresos(dias, 'dia')[1]).toEqual({ etiqueta: 'jue 1', ingresos: 50 });
  });

  it('por semana suma de lunes a domingo y se etiqueta con el primer día del rango', () => {
    expect(agruparIngresos(dias, 'semana')).toEqual([
      { etiqueta: '30/09', ingresos: 175 },
      { etiqueta: '05/10', ingresos: 10 },
    ]);
  });

  it('por mes suma cada mes en orden', () => {
    expect(agruparIngresos(dias, 'mes')).toEqual([
      { etiqueta: 'sep 2026', ingresos: 100 },
      { etiqueta: 'oct 2026', ingresos: 85 },
    ]);
  });

  it('por hora etiqueta cada hora', () => {
    expect(barrasPorHora([{ hora: 9, ingresos: 5 }])).toEqual([{ etiqueta: '09h', ingresos: 5 }]);
  });
});

describe('agrupacionDelPeriodo', () => {
  it('hoy por hora, semana por día, mes por semana y año por mes', () => {
    expect(agrupacionDelPeriodo('hoy', 1)).toBe('hora');
    expect(agrupacionDelPeriodo('semana', 7)).toBe('dia');
    expect(agrupacionDelPeriodo('mes', 31)).toBe('semana');
    expect(agrupacionDelPeriodo('anio', 300)).toBe('mes');
  });

  it('el personalizado elige según el largo', () => {
    expect(agrupacionDelPeriodo('personalizado', 1)).toBe('hora');
    expect(agrupacionDelPeriodo('personalizado', 10)).toBe('dia');
    expect(agrupacionDelPeriodo('personalizado', 40)).toBe('semana');
    expect(agrupacionDelPeriodo('personalizado', 200)).toBe('mes');
  });

  it('"Este año" arranca el 1 de enero', () => {
    expect(rangoPredefinido('anio', new Date(2026, 10, 1))).toEqual({ desde: '2026-01-01', hasta: '2026-11-01' });
  });
});
