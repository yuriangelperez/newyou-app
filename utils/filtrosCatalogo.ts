import { calcularPrecioFinal, Producto } from '../types';
import { mismoTalle } from '../constants/talles';
import { normalizarPublicos, PUBLICOS } from '../constants/categoriasProductos';

// Opciones del panel "Ordenar y filtrar" del inicio. La primera de cada lista es "sin filtro".
export const ORDENES = ['Destacados', 'Menor precio', 'Mayor precio'] as const;
// Atajos de precio (chips). Además se puede escribir un mínimo y un máximo propios.
export interface RangoPrecio {
  min: number | null;
  max: number | null;
}
export const RANGOS_RAPIDOS: { texto: string; rango: RangoPrecio }[] = [
  { texto: 'Hasta $20.000', rango: { min: null, max: 20000 } },
  { texto: '$20.000 a $50.000', rango: { min: 20000, max: 50000 } },
  { texto: '$50.000 a $100.000', rango: { min: 50000, max: 100000 } },
  { texto: 'Más de $100.000', rango: { min: 100000, max: null } },
];
export const CONDICIONES = ['Todas', 'Nuevo', 'Usado'] as const;
// Talles separados en prendas y calzado. "Todos" no es un chip: se vuelve a "Todos" tocando el elegido.
export const TALLE_TODOS = 'Todos';
export { TALLES_CALZADO, TALLES_ROPA } from '../constants/talles';


export interface FiltrosExtra {
  precioMin: number | null;
  precioMax: number | null;
  condicion: string;
  talle: string;
}

export const FILTROS_EXTRA_INICIALES: FiltrosExtra = {
  precioMin: null,
  precioMax: null,
  condicion: CONDICIONES[0],
  talle: TALLE_TODOS,
};

/** Precio final (con descuento) entre el mínimo y el máximo, ambos inclusivos; si están al revés se dan vuelta. */
export function cumplePrecio(producto: Producto, min: number | null, max: number | null) {
  const [desde, hasta] = min !== null && max !== null && min > max ? [max, min] : [min, max];
  const precio = calcularPrecioFinal(producto);
  return (desde === null || precio >= desde) && (hasta === null || precio <= hasta);
}

/** Lo que el usuario escribe en Mínimo/Máximo: sólo dígitos ("35.000" → 35000; vacío → null). */
export function leerMontoFiltro(texto: string): number | null {
  const digitos = texto.replace(/\D/g, '');
  return digitos ? Number(digitos) : null;
}

export function cumpleFiltrosExtra(producto: Producto, filtros: FiltrosExtra) {
  if (!cumplePrecio(producto, filtros.precioMin, filtros.precioMax)) return false;
  if (filtros.condicion !== 'Todas' && (producto.condicion ?? 'nuevo') !== filtros.condicion.toLowerCase()) return false;
  if (filtros.talle !== 'Todos' && !(producto.talle ?? []).some((talle) => mismoTalle(talle, filtros.talle))) return false;
  return true;
}

export function ordenarPorPrecio<T extends Producto>(productos: T[], orden: string) {
  if (orden === ORDENES[0]) return productos;
  const signo = orden === 'Menor precio' ? 1 : -1;
  return [...productos].sort((a, b) => signo * (calcularPrecioFinal(a) - calcularPrecioFinal(b)));
}

export function cantidadDePrendas(cantidad: number) {
  return cantidad === 1 ? '1 prenda' : `${cantidad.toLocaleString('es-AR')} prendas`;
}

// Temporada y público: las mismas opciones en el inicio y en Categorías. "Todo" es sin filtro.
export const TEMPORADAS = ['Todo', 'Promociones', 'Invierno', 'Verano', 'Otoño', 'Primavera', 'Todo el año'] as const;
export const PUBLICOS_FILTRO = ['Todo', ...PUBLICOS] as const;

export function cumpleTemporadaPublico(producto: Producto, temporada: string, publico: string) {
  if (publico !== 'Todo' && !(normalizarPublicos(producto.categoriaProducto?.publico) as string[]).includes(publico)) {
    return false;
  }
  if (temporada === 'Todo') return true;
  if (temporada === 'Promociones') return producto.descuentoPorcentaje > 0;
  return producto.categoriaProducto?.temporada === temporada;
}
