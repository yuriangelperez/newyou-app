import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, TextStyle, View } from 'react-native';

import { Colors, FontSize } from '../../constants/theme';

/** Tilde azul de empresa verificada. */
export function InsigniaVerificada({ tamano = 14 }: { tamano?: number }) {
  return (
    <Ionicons
      accessibilityLabel="Empresa verificada"
      name="checkmark-circle"
      size={tamano}
      color={Colors.verified}
    />
  );
}

interface NombreVendedorProps {
  nombre: string;
  verificada?: boolean;
  /** Texto antes del nombre, p. ej. "Vendido por ". */
  prefijo?: string;
  tamano?: number;
  estilo?: TextStyle;
}

/** "Vendido por Tienda ✓": nombre de quien vende con la insignia si la empresa está verificada. */
export function NombreVendedor({ nombre, verificada = false, prefijo = '', tamano = FontSize.sm, estilo }: NombreVendedorProps) {
  return (
    <View style={styles.row}>
      <Text numberOfLines={1} style={[styles.texto, { fontSize: tamano }, estilo]}>
        {prefijo}
        <Text style={styles.nombre}>{nombre}</Text>
      </Text>
      {verificada ? <InsigniaVerificada tamano={tamano + 2} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', columnGap: 3, flexShrink: 1 },
  texto: { color: Colors.textMuted, fontFamily: 'Montserrat_600SemiBold', flexShrink: 1 },
  nombre: { color: Colors.primary },
});
