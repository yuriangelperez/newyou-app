import { normalizarTexto } from '../utils/texto';

// Los mismos talles que los filtros de Categorías: al publicar sólo se eligen de estas listas.
export const TALLES_ROPA = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'Único'] as const;
export const TALLES_CALZADO = ['35', '36', '37', '38', '39', '40', '41', '42', '43', '44', '45', '46'] as const;

export function tallesPara(esCalzado: boolean): readonly string[] {
  return esCalzado ? TALLES_CALZADO : TALLES_ROPA;
}

/** Compara talles sin distinguir mayúsculas ni tildes ("Unico" = "Único"). */
export function mismoTalle(a: string, b: string) {
  return normalizarTexto(a) === normalizarTexto(b);
}

/** Talles válidos de la lista (en su forma oficial), sin repetir. */
export function tallesValidos(talles: string[], esCalzado: boolean) {
  const lista = tallesPara(esCalzado);
  return lista.filter((talle) => talles.some((item) => mismoTalle(item, talle)));
}
