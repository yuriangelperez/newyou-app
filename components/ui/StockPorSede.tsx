import { StyleSheet, Text, TextInput, View } from 'react-native';

import { Colors, FontSize, Radius, Spacing } from '../../constants/theme';
import { Sede } from '../../services/empresasService';

interface StockPorSedeProps {
  sedes: Sede[];
  /** Cantidad por id de sede, como texto para poder editar libremente. */
  valores: Record<number, string>;
  onChange: (sedeId: number, valor: string) => void;
  /** Sedes de la empresa que el usuario no puede editar (se muestran sólo para informar). */
  sedesSoloLectura?: Sede[];
  cantidadesSoloLectura?: Record<number, number>;
}

/** Carga del stock de una prenda en cada sede de la empresa. */
export function StockPorSede({
  sedes,
  valores,
  onChange,
  sedesSoloLectura = [],
  cantidadesSoloLectura = {},
}: StockPorSedeProps) {
  const total =
    sedes.reduce((suma, sede) => suma + (Number(valores[sede.id]) || 0), 0) +
    sedesSoloLectura.reduce((suma, sede) => suma + (cantidadesSoloLectura[sede.id] ?? 0), 0);

  return (
    <View style={styles.wrapper}>
      <Text style={styles.title}>Stock por sede</Text>
      {sedes.length === 0 ? (
        <Text style={styles.hint}>No tenés sedes asignadas. Pedile a un administrador que te dé acceso.</Text>
      ) : null}
      {sedes.map((sede) => (
        <View key={sede.id} style={styles.row}>
          <View style={styles.info}>
            <Text style={styles.name}>{sede.nombre}</Text>
            <Text numberOfLines={1} style={styles.hint}>
              {sede.direccion}
            </Text>
          </View>
          <TextInput
            accessibilityLabel={`Stock en ${sede.nombre}`}
            value={valores[sede.id] ?? ''}
            onChangeText={(texto) => onChange(sede.id, texto.replace(/\D/g, ''))}
            keyboardType="number-pad"
            placeholder="0"
            placeholderTextColor={Colors.textMuted}
            style={styles.input}
          />
        </View>
      ))}
      {sedesSoloLectura.map((sede) => (
        <View key={sede.id} style={styles.row}>
          <View style={styles.info}>
            <Text style={styles.name}>{sede.nombre}</Text>
            <Text style={styles.hint}>Sin acceso para editar</Text>
          </View>
          <Text style={styles.readonly}>{cantidadesSoloLectura[sede.id] ?? 0}</Text>
        </View>
      ))}
      <Text style={styles.total}>Total: {total} unidades</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    rowGap: Spacing.sm,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.secondary,
    borderRadius: Radius.md,
    backgroundColor: Colors.surface,
    marginBottom: Spacing.md,
  },
  title: { color: Colors.primary, fontSize: FontSize.lg, fontFamily: 'Montserrat_700Bold' },
  row: { flexDirection: 'row', alignItems: 'center', columnGap: Spacing.md },
  info: { flex: 1 },
  name: { color: Colors.text, fontSize: FontSize.md, fontFamily: 'Montserrat_600SemiBold' },
  hint: { color: Colors.textMuted, fontSize: FontSize.sm, fontFamily: 'Montserrat_500Medium' },
  input: {
    width: 80,
    minHeight: 40,
    paddingHorizontal: Spacing.sm,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.secondary,
    textAlign: 'center',
    color: Colors.text,
    fontSize: FontSize.md,
    fontFamily: 'Montserrat_500Medium',
  },
  readonly: { width: 80, textAlign: 'center', color: Colors.textMuted, fontFamily: 'Montserrat_600SemiBold' },
  total: { color: Colors.primary, fontSize: FontSize.md, fontFamily: 'Montserrat_700Bold', textAlign: 'right' },
});
