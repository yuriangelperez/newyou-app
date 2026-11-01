import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Colors } from '../../constants/theme';
import { PUBLICOS_FILTRO, TEMPORADAS } from '../../utils/filtrosCatalogo';

interface ChipsTemporadaPublicoProps {
  temporada: string;
  publico: string;
  onTemporada: (valor: string) => void;
  onPublico: (valor: string) => void;
}

/** Fila deslizable: temporadas, una rayita y públicos. Tocar el elegido lo desmarca; "Todo" limpia ambos. */
export function ChipsTemporadaPublico({ temporada, publico, onTemporada, onPublico }: ChipsTemporadaPublicoProps) {
  const sinFiltro = temporada === 'Todo' && publico === 'Todo';

  const chip = (clave: string, texto: string, elegido: boolean, onPress: () => void) => (
    <Pressable
      key={clave}
      testID={`chip-${texto}`}
      accessibilityRole="button"
      accessibilityState={{ selected: elegido }}
      onPress={onPress}
      style={[styles.chip, elegido && styles.chipActivo]}>
      <Text style={styles.chipTexto}>{texto}</Text>
    </Pressable>
  );

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.fila} style={styles.scroll}>
      {TEMPORADAS.map((tag) =>
        chip(`tag-${tag}`, tag, tag === 'Todo' ? sinFiltro : tag === temporada, () => {
          if (tag === 'Todo') {
            onTemporada('Todo');
            onPublico('Todo');
          } else {
            onTemporada(tag === temporada ? 'Todo' : tag);
          }
        }),
      )}
      <View style={styles.separador} />
      {PUBLICOS_FILTRO.slice(1).map((p) => chip(`publico-${p}`, p, p === publico, () => onPublico(p === publico ? 'Todo' : p)))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flexGrow: 0 },
  fila: { paddingHorizontal: 16, columnGap: 8, alignItems: 'center' },
  chip: {
    height: 30,
    borderRadius: 10,
    backgroundColor: Colors.backgroundMuted,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  chipActivo: { backgroundColor: Colors.tertiary },
  chipTexto: { color: Colors.ink, fontSize: 12, fontFamily: 'Montserrat_400Regular' },
  separador: { width: 1, height: 18, backgroundColor: Colors.border },
});
