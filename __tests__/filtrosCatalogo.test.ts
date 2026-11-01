import { Producto } from '../types';
import {
  cantidadDePrendas,
  cumpleFiltrosExtra,
  cumplePrecio,
  leerMontoFiltro,
  FILTROS_EXTRA_INICIALES,
  ordenarPorPrecio,
} from '../utils/filtrosCatalogo';

const prenda = (datos: Partial<Producto>): Producto => ({
  id: 'p',
  nombre: 'Prenda',
  precio: 10000,
  descuentoPorcentaje: 0,
  imagen: '',
  categoria: 'Remeras',
  disponible: true,
  stock: 1,
  descripcion: '',
  ...datos,
});

describe('filtros del catálogo', () => {
  it('filtra por rango usando el precio con descuento', () => {
    const conDescuento = prenda({ precio: 25000, descuentoPorcentaje: 20 }); // 20.000
    expect(cumplePrecio(conDescuento, null, 19999)).toBe(false);
    expect(cumplePrecio(conDescuento, 20000, 50000)).toBe(true);
    expect(cumplePrecio(prenda({ precio: 150000 }), 100000, null)).toBe(true);
    expect(cumplePrecio(prenda({}), null, null)).toBe(true);
    // Rango personalizado escrito al revés: se da vuelta.
    expect(cumplePrecio(conDescuento, 30000, 15000)).toBe(true);
  });

  it('lee lo que se escribe en mínimo y máximo', () => {
    expect(leerMontoFiltro('35.000')).toBe(35000);
    expect(leerMontoFiltro('$ 1.200')).toBe(1200);
    expect(leerMontoFiltro('')).toBeNull();
  });

  it('filtra por estado y talle', () => {
    const usada = prenda({ condicion: 'usado', talle: ['M', 'Unico'] });
    expect(cumpleFiltrosExtra(usada, { ...FILTROS_EXTRA_INICIALES, condicion: 'Usado' })).toBe(true);
    expect(cumpleFiltrosExtra(usada, { ...FILTROS_EXTRA_INICIALES, condicion: 'Nuevo' })).toBe(false);
    expect(cumpleFiltrosExtra(usada, { ...FILTROS_EXTRA_INICIALES, talle: 'Único' })).toBe(true);
    expect(cumpleFiltrosExtra(usada, { ...FILTROS_EXTRA_INICIALES, talle: 'XL' })).toBe(false);
    // Sin condición cargada cuenta como nueva.
    expect(cumpleFiltrosExtra(prenda({}), { ...FILTROS_EXTRA_INICIALES, condicion: 'Nuevo' })).toBe(true);
  });

  it('ordena por precio final sin tocar la lista original', () => {
    const lista = [prenda({ id: 'a', precio: 30000 }), prenda({ id: 'b', precio: 50000, descuentoPorcentaje: 50 }), prenda({ id: 'c', precio: 10000 })];
    expect(ordenarPorPrecio(lista, 'Menor precio').map((p) => p.id)).toEqual(['c', 'b', 'a']);
    expect(ordenarPorPrecio(lista, 'Mayor precio').map((p) => p.id)).toEqual(['a', 'b', 'c']);
    expect(ordenarPorPrecio(lista, 'Destacados')).toBe(lista);
  });

  it('arma el texto de cantidad', () => {
    expect(cantidadDePrendas(1)).toBe('1 prenda');
    expect(cantidadDePrendas(24)).toBe('24 prendas');
  });
});
