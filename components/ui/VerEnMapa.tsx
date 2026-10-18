import { Pressable, StyleSheet, Text } from 'react-native';

import { Colors, FontSize } from '../../constants/theme';
import { abrirDireccionEnMapa } from '../../services/locationService';

interface VerEnMapaProps {
  /** Dirección en texto a buscar; si está vacía no se muestra nada. */
  direccion: string;
}

/** Enlace "Ver en el mapa" para comprobar que una dirección escrita es correcta. */
export function VerEnMapa({ direccion }: VerEnMapaProps) {
  if (!direccion.trim()) {
    return null;
  }

  return (
    <Pressable
      accessibilityRole="link"
      onPress={() => void abrirDireccionEnMapa(direccion)}
      style={styles.link}
    >
      <Text style={styles.text}>Ver en el mapa</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  link: { alignSelf: 'flex-start', paddingVertical: 4 },
  text: {
    color: Colors.secondary,
    fontSize: FontSize.sm,
    fontFamily: 'Montserrat_700Bold',
    textDecorationLine: 'underline',
  },
});
