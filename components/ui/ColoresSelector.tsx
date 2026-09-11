import { Control, useController } from 'react-hook-form';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { PRODUCT_COLOR_OPTIONS, resolveProductColorHex } from '../../constants/productColors';
import { Colors, Radius } from '../../constants/theme';
import { ProductoFormValues } from '../../schemas/productoSchema';

export function ColoresSelector({ control }: { control: Control<ProductoFormValues> }) {
  const { field, fieldState } = useController({ control, name: 'colores' });
  const seleccionados = String(field.value || '').split(',').map((color) => color.trim()).filter(Boolean);
  const toggle = (color: string) => field.onChange(seleccionados.includes(color) ? seleccionados.filter((item) => item !== color).join(', ') : [...seleccionados, color].join(', '));

  return <View style={styles.container}>
    <Text style={styles.label}>Colores</Text>
    <View style={styles.options}>{PRODUCT_COLOR_OPTIONS.map((color) => {
      const selected = seleccionados.includes(color);
      const tone = resolveProductColorHex(color, Colors.secondary);

      return <Pressable key={color} onPress={() => toggle(color)} style={[styles.option, selected && styles.selected]}>
        <View style={[styles.swatch, { backgroundColor: tone }, color === 'Blanco' && styles.whiteSwatch]} />
        <Text style={[styles.text, { color: tone }, color === 'Blanco' && styles.whiteText]}>{color}</Text>
      </Pressable>;
    })}</View>
    {fieldState.error ? <Text style={styles.error}>{fieldState.error.message}</Text> : null}
  </View>;
}

const styles = StyleSheet.create({ container: { gap: 7, marginBottom: 14 }, label: { color: Colors.primary, fontSize: 14, fontFamily: 'Montserrat_600SemiBold' }, options: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 }, option: { borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.md, paddingHorizontal: 11, minHeight: 34, justifyContent: 'center', flexDirection: 'row', alignItems: 'center', gap: 7 }, selected: { borderColor: Colors.secondary, backgroundColor: Colors.tertiary }, swatch: { width: 10, height: 10, borderRadius: 999 }, whiteSwatch: { borderWidth: 1, borderColor: Colors.border }, text: { color: Colors.text, fontSize: 12, fontFamily: 'Montserrat_600SemiBold' }, whiteText: { color: '#B2B2B2' }, error: { color: Colors.danger, fontSize: 12 } });
