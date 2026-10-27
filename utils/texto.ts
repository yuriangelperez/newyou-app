/** Minúsculas y sin tildes, para comparar textos de búsqueda ("Pantalón" = "pantalon"). */
export function normalizarTexto(texto: string) {
  return texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();
}

/** true si `texto` contiene `busqueda`, sin distinguir mayúsculas ni tildes. */
export function incluyeTexto(texto: string | null | undefined, busqueda: string) {
  return normalizarTexto(texto ?? '').includes(normalizarTexto(busqueda));
}
