// Precios en formato argentino: el punto separa miles y la coma, los decimales ("1.500,50").

export const COMISION_PORCENTAJE = 10;

type ResultadoPrecio = { ok: true; valor: number } | { ok: false; mensaje: string };

export function parsearPrecio(entrada: string | number): ResultadoPrecio {
  if (typeof entrada === 'number') {
    return Number.isFinite(entrada) ? { ok: true, valor: entrada } : { ok: false, mensaje: 'Ingresá sólo números.' };
  }

  const texto = entrada.trim();
  if (!texto) {
    return { ok: false, mensaje: 'Ingresá el precio.' };
  }

  if (!/^[\d.,]+$/.test(texto)) {
    return { ok: false, mensaje: 'Ingresá sólo números (sin $ ni letras).' };
  }

  const [entero, decimales, ...resto] = texto.split(',');
  if (resto.length > 0 || (decimales !== undefined && !/^\d{1,2}$/.test(decimales))) {
    return { ok: false, mensaje: 'Usá la coma sólo para los decimales, con hasta 2 cifras (1.500,50).' };
  }

  // Sin puntos, o con puntos cada 3 cifras: 35000, 35.000, 1.250.000.
  if (!/^\d+$/.test(entero) && !/^\d{1,3}(\.\d{3})+$/.test(entero)) {
    return {
      ok: false,
      mensaje: 'Usá el punto sólo para separar miles (35.000) y la coma para los decimales (1.500,50).',
    };
  }

  return { ok: true, valor: Number(`${entero.replace(/\./g, '')}.${decimales ?? '0'}`) };
}

/** Número a texto para el campo: 35000 → "35.000", 1500.5 → "1.500,50". */
export function formatearPrecioInput(valor: number) {
  if (!Number.isFinite(valor) || valor <= 0) {
    return '';
  }

  const entero = Math.trunc(valor).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  const centavos = Math.round((valor - Math.trunc(valor)) * 100);
  return centavos > 0 ? `${entero},${String(centavos).padStart(2, '0')}` : entero;
}

/** Comisión de New You (IVA incluido) que paga el vendedor y lo que le queda. */
export function calcularComision(precio: number, porcentaje = COMISION_PORCENTAJE) {
  const comision = Math.round(precio * porcentaje) / 100;
  return { comision, ganancia: Math.round((precio - comision) * 100) / 100 };
}
