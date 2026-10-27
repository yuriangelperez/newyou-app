import { useEffect } from 'react';
import { Control, useController, useWatch } from 'react-hook-form';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { mismoTalle, tallesPara, tallesValidos } from '../../constants/talles';
import { Colors, Radius } from '../../constants/theme';
import { ProductoFormValues } from '../../schemas/productoSchema';

/** Talles con chips (los mismos de los filtros): ropa o calzado según la categoría. */
export function TallesSelector({ control }: { control: Control<ProductoFormValues> }) {
  const { field, fieldState } = useController({ control, name: 'talle' });
  const tipoPrenda = useWatch({ control, name: 'tipoPrenda' });
  const esCalzado = tipoPrenda === 'Calzado';
  const opciones = tallesPara(esCalzado);
  const valor = String(field.value || '');
  const seleccionados = valor.split(',').map((talle) => talle.trim()).filter(Boolean);
  const { onChange } = field;

  // Al pasar de ropa a calzado (o al revés) se quitan los talles que ya no corresponden.
  useEffect(() => {
    const actuales = valor.split(',').map((talle) => talle.trim()).filter(Boolean);
    const validos = tallesValidos(actuales, esCalzado);
    if (validos.length !== actuales.length) {
      onChange(validos.join(', '));
    }
  }, [esCalzado, onChange, valor]);

  const toggle = (talle: string) => {
    const elegido = seleccionados.some((item) => mismoTalle(item, talle));
    const lista = elegido
      ? seleccionados.filter((item) => !mismoTalle(item, talle))
      : [...seleccionados, talle];
    // Se guardan en el orden de la lista (XS antes que M, 38 antes que 40).
    onChange(tallesValidos(lista, esCalzado).join(', '));
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Talles {esCalzado ? '(calzado)' : ''}</Text>
      <View style={styles.options}>
        {opciones.map((talle) => {
          const selected = seleccionados.some((item) => mismoTalle(item, talle));
          return (
            <Pressable
              key={talle}
              testID={`talle-${talle}`}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: selected }}
              onPress={() => toggle(talle)}
              style={[styles.option, selected && styles.selected]}>
              <Text style={[styles.text, selected && styles.selectedText]}>{talle}</Text>
            </Pressable>
          );
        })}
      </View>
      <Text style={styles.hint}>Podés elegir varios.</Text>
      {fieldState.error ? <Text style={styles.error}>{fieldState.error.message}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 7, marginTop: 12, marginBottom: 14 },
  label: { color: Colors.primary, fontSize: 14, fontFamily: 'Montserrat_600SemiBold' },
  options: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  option: {
    minWidth: 44,
    minHeight: 36,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: Colors.secondary,
    borderRadius: Radius.md,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selected: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  text: { color: Colors.primary, fontSize: 13, fontFamily: 'Montserrat_600SemiBold' },
  selectedText: { color: Colors.onPrimary },
  hint: { color: Colors.textMuted, fontSize: 12, fontFamily: 'Montserrat_400Regular' },
  error: { color: Colors.danger, fontSize: 12 },
});
