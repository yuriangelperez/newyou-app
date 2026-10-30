import { Ionicons } from '@expo/vector-icons';
import { Control, useController } from 'react-hook-form';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Colors, Radius } from '../../constants/theme';
import { ProductoFormValues } from '../../schemas/productoSchema';

const COLORES = ['Negro', 'Blanco', 'Beige', 'Marrón', 'Azul', 'Rojo', 'Verde', 'Gris', 'Rosa', 'Amarillo'];
const TONOS: Record<string, string> = { Negro: '#1F1E1E', Blanco: '#FFFFFF', Beige: '#D8C3A5', Marrón: '#6F4E37', Azul: '#2563EB', Rojo: '#DC2626', Verde: '#19cc5b', Gris: '#6B7280', Rosa: '#EC4899', Amarillo: '#fdc03c' };

const aRgb = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
const aHex = (rgb: number[]) => `#${rgb.map((v) => Math.round(v).toString(16).padStart(2, '0')).join('')}`;
const mezclar = (hex: string, con: number, cantidad: number) => aHex(aRgb(hex).map((v) => v + (con - v) * cantidad));

/** Luminancia relativa (WCAG). */
function luminancia(hex: string) {
  const [r, g, b] = aRgb(hex).map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

const contraste = (a: string, b: string) => {
  const [claro, oscuro] = [luminancia(a), luminancia(b)].sort((x, y) => y - x);
  return (claro + 0.05) / (oscuro + 0.05);
};

/** Texto del mismo color, un tono más oscuro o más claro: el que más contraste da (WCAG). */
export function textoSobreColor(fondo: string) {
  const oscuro = mezclar(fondo, 0, 0.82);
  const claro = mezclar(fondo, 255, 0.93);
  return contraste(fondo, oscuro) >= contraste(fondo, claro) ? oscuro : claro;
}

export function ColoresSelector({ control }: { control: Control<ProductoFormValues> }) {
  const { field, fieldState } = useController({ control, name: 'colores' });
  const seleccionados = String(field.value || '').split(',').map((color) => color.trim()).filter(Boolean);
  const toggle = (color: string) => field.onChange(seleccionados.includes(color) ? seleccionados.filter((item) => item !== color).join(', ') : [...seleccionados, color].join(', '));

  return <View style={styles.container}>
    <Text style={styles.label}>Colores</Text>
    <View style={styles.options}>{COLORES.map((color) => {
      const selected = seleccionados.includes(color);
      const tono = TONOS[color];
      const texto = textoSobreColor(tono);

      // Cada botón lleva el color de la prenda; elegido, borde grueso y tilde.
      return <Pressable
        key={color}
        testID={`color-${color}`}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: selected }}
        onPress={() => toggle(color)}
        style={[styles.option, { backgroundColor: tono, borderColor: color === 'Blanco' ? Colors.border : tono }, selected && styles.selected]}>
        {selected ? <Ionicons name="checkmark" size={14} color={texto} /> : null}
        <Text style={[styles.text, { color: texto }]}>{color}</Text>
      </Pressable>;
    })}</View>
    {fieldState.error ? <Text style={styles.error}>{fieldState.error.message}</Text> : null}
  </View>;
}

const styles = StyleSheet.create({ container: { gap: 7, marginBottom: 14 }, label: { color: Colors.primary, fontSize: 14, fontFamily: 'Montserrat_600SemiBold' }, options: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 }, option: { borderWidth: 2, borderRadius: Radius.md, paddingHorizontal: 11, minHeight: 34, justifyContent: 'center', flexDirection: 'row', alignItems: 'center', gap: 5 }, selected: { borderColor: Colors.primary, borderWidth: 3 }, text: { fontSize: 12, fontFamily: 'Montserrat_700Bold' }, error: { color: Colors.danger, fontSize: 12 } });
