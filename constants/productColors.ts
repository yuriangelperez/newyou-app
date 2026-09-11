export const PRODUCT_COLOR_OPTIONS = [
  'Negro',
  'Blanco',
  'Beige',
  'Marrón',
  'Azul',
  'Rojo',
  'Verde',
  'Gris',
  'Rosa',
  'Amarillo',
] as const;

const PRODUCT_COLOR_SWATCHES: Record<string, string> = {
  negro: '#1F1E1E',
  blanco: '#FFFFFF',
  beige: '#D8C3A5',
  marron: '#6F4E37',
  azul: '#2563EB',
  rojo: '#DC2626',
  verde: '#16A34A',
  gris: '#6B7280',
  rosa: '#EC4899',
  amarillo: '#CA8A04',
};

const PRODUCT_COLOR_ALIASES: Record<string, string> = {
  cafe: 'marron',
  marronclaro: 'beige',
  celeste: 'azul',
  fucsia: 'rosa',
  plateado: 'gris',
  grisclaro: 'gris',
  grisoscuro: 'gris',
};

export function normalizeProductColorKey(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9#]/g, '')
    .trim()
    .toLowerCase();
}

export function resolveProductColorHex(color: string, fallback: string) {
  const normalizedColor = normalizeProductColorKey(color);

  if (/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(normalizedColor)) {
    return normalizedColor;
  }

  const alias = PRODUCT_COLOR_ALIASES[normalizedColor] ?? normalizedColor;
  return PRODUCT_COLOR_SWATCHES[alias] ?? fallback;
}
