// constants/theme.ts

import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

// Modo oscuro (HU19). Los estilos se arman una sola vez con StyleSheet.create al cargar
// cada pantalla, así que el tema se elige al abrir la app: se lee de forma sincrónica la
// preferencia guardada y, al cambiarla en Ajustes, la app se recarga (services/temaService.ts).
export const CLAVE_TEMA = 'ny_tema';
export type Tema = 'claro' | 'oscuro';

export function leerTemaGuardado(): Tema {
  try {
    const valor =
      Platform.OS === 'web'
        ? globalThis.localStorage?.getItem(CLAVE_TEMA)
        : SecureStore.getItem(CLAVE_TEMA);
    return valor === 'oscuro' ? 'oscuro' : 'claro';
  } catch {
    return 'claro';
  }
}

const ColoresClaros = {
  primary: '#493628',
  secondary: '#AB876D',
  tertiary: '#D5BFB3',

  background: '#F4F4F4',
  backgroundMuted: '#D9D9D9',
  border: '#E5E5E5',
  surface: '#FFFFFF',

  text: '#152238',
  textMuted: '#64748B',
  // Marrón oscuro de títulos y precios.
  textStrong: '#2D1F16',
  // Texto secundario en tonos tierra.
  textEarth: '#5C514B',
  textEarthMuted: '#8A7B73',
  ink: '#000000',
  // Texto e íconos sobre un fondo `primary`.
  onPrimary: '#FFFFFF',

  // Fondos suaves de chips, tarjetas destacadas y el interruptor apagado.
  chip: '#E4E0E1',
  accentSoft: '#E8D7CB',
  switchOff: '#CFCFCF',
  dangerSoft: '#FFF3F3',
  dangerBorder: '#F5B5B5',

  danger: '#EF4444',
  success: '#22C55E',
  warning: '#F59E0B',
  verified: '#1D9BF0',

  black: '#000000',
  white: '#FFFFFF',
};

// Mismos nombres con valores para fondo oscuro: lo claro pasa a oscuro y el texto, a claro.
// `primary` se usa sobre todo como color de texto, por eso en oscuro es un tono claro.
const ColoresOscuros: typeof ColoresClaros = {
  primary: '#E6D2C3',
  secondary: '#AB876D',
  tertiary: '#4A3B31',

  background: '#121212',
  backgroundMuted: '#2C2C2C',
  border: '#333333',
  surface: '#1E1E1E',

  text: '#E8EAED',
  textMuted: '#A3ACB9',
  textStrong: '#F2E6DC',
  textEarth: '#CDBFB5',
  textEarthMuted: '#A99B92',
  ink: '#F5F5F5',
  onPrimary: '#2D1F16',

  chip: '#3A3330',
  accentSoft: '#4A3B31',
  switchOff: '#5A5A5A',
  dangerSoft: '#3B1F1F',
  dangerBorder: '#7A3B3B',

  danger: '#EF4444',
  success: '#22C55E',
  warning: '#F59E0B',
  verified: '#1D9BF0',

  black: '#000000',
  white: '#FFFFFF',
};

export const TemaActual: Tema = leerTemaGuardado();
export const esModoOscuro = TemaActual === 'oscuro';

export const Colors = esModoOscuro ? ColoresOscuros : ColoresClaros;

export const FontFamily = {
  montserratBold: 'Montserrat-Bold',
  montserratMedium: 'Montserrat-Medium',
  montserratRegular: 'Montserrat-Regular',
  montserratSemiBold: 'Montserrat-SemiBold',
};

export const FontSize = {
  xs: 11,
  sm: 12,
  md: 14,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const Radius = {
  sm: 4,
  md: 8,
  lg: 12,
  full: 999,
};

export const Size = {
  width16: 16,
  width34: 34,
  width40: 40,

  height19: 19,
  height34: 34,
  height36: 36,
  height40: 40,
  height60: 60,
  height88: 88,
};

// Elevaciones del estilo "checkout": sombra terra en lo seleccionado y panel inferior.
export const Shadow = {
  // Elevación suave para tarjetas y listas.
  card: {
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  selected: {
    shadowColor: Colors.secondary,
    shadowOffset: { width: 3, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 4,
    elevation: 4,
  },
  panel: {
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 8,
  },
};

// Íconos de la barra de estado: oscuros sobre fondo claro y claros sobre fondo oscuro.
export const EstiloBarraEstado = esModoOscuro ? 'light' : 'dark';
