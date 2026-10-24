import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Colors, FontSize } from '../../constants/theme';

interface EstrellasProps {
  valor: number;
  /** Si se pasa, las estrellas se pueden tocar para elegir el puntaje. */
  onChange?: (valor: number) => void;
  tamano?: number;
}

/** Puntaje de 1 a 5 con estrellas (medias estrellas al mostrar un promedio). */
export function Estrellas({ valor, onChange, tamano = 18 }: EstrellasProps) {
  return (
    <View accessibilityLabel={`${valor} de 5 estrellas`} style={styles.row}>
      {[1, 2, 3, 4, 5].map((n) => {
        const icono = valor >= n ? 'star' : valor >= n - 0.5 ? 'star-half' : 'star-outline';
        const estrella = <Ionicons name={icono} size={tamano} color={Colors.warning} />;

        return onChange ? (
          <Pressable key={n} accessibilityLabel={`${n} estrellas`} hitSlop={6} onPress={() => onChange(n)}>
            {estrella}
          </Pressable>
        ) : (
          <View key={n}>{estrella}</View>
        );
      })}
    </View>
  );
}

/** "★ 4.5 (12 opiniones)" o "Sin opiniones todavía". */
export function ResumenReputacion({ promedio, cantidad }: { promedio: number | null; cantidad: number }) {
  if (!cantidad || promedio === null) {
    return <Text style={styles.texto}>Sin opiniones todavía</Text>;
  }

  return (
    <View style={styles.row}>
      <Estrellas valor={promedio} tamano={16} />
      <Text style={styles.texto}>{` ${promedio.toFixed(1)} (${cantidad} ${cantidad === 1 ? 'opinión' : 'opiniones'})`}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', columnGap: 2 },
  texto: { color: Colors.textMuted, fontSize: FontSize.sm, fontFamily: 'Montserrat_600SemiBold' },
});
