// Filtro "Cercanía" del inicio: radio alrededor de la ubicación del comprador.
export const CERCANIAS = ['Cualquier distancia', 'Hasta 2 km', 'Hasta 5 km', 'Hasta 10 km', 'Hasta 25 km'] as const;

/** Radio en km de la opción elegida (null = sin filtro). */
export function radioDeCercania(opcion: string): number | null {
  const km = opcion.match(/(\d+)\s*km/)?.[1];
  return km ? Number(km) : null;
}

/** "a 350 m" debajo de 1 km; "a 1,2 km" desde 1 km (coma decimal). */
export function formatearDistancia(km: number) {
  if (km < 1) {
    return `a ${Math.max(100, Math.round((km * 1000) / 50) * 50)} m`;
  }
  return `a ${km.toLocaleString('es-AR', { maximumFractionDigits: 1 })} km`;
}

/** Ordena de más cerca a más lejos; las que no tienen distancia van al final. */
export function ordenarPorDistancia<T extends { id: string }>(productos: T[], distancias: Record<string, number>) {
  return [...productos].sort(
    (a, b) => (distancias[a.id] ?? Number.POSITIVE_INFINITY) - (distancias[b.id] ?? Number.POSITIVE_INFINITY),
  );
}
