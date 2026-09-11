import { Control, useController } from 'react-hook-form';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { PUBLICOS, TEMPORADAS, TIPOS_PRENDA } from '../../constants/categoriasProductos';
import { Colors, Radius } from '../../constants/theme';
import { ProductoFormValues } from '../../schemas/productoSchema';

interface CategoriaProductoSelectorProps {
  control: Control<ProductoFormValues>;
}

export function CategoriaProductoSelector({ control }: CategoriaProductoSelectorProps) {
  const tipoPrenda = useController({ control, name: 'tipoPrenda' });
  const temporada = useController({ control, name: 'temporada' });
  const publico = useController({ control, name: 'publico' });

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Categoría de la prenda</Text>
      <OptionGroup label="Tipo de prenda" options={TIPOS_PRENDA} value={tipoPrenda.field.value} onChange={tipoPrenda.field.onChange} />
      <OptionGroup label="Temporada" options={TEMPORADAS} value={temporada.field.value} onChange={temporada.field.onChange} />
      <OptionGroup label="Público" options={PUBLICOS} value={publico.field.value} onChange={publico.field.onChange} />
    </View>
  );
}

function OptionGroup({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: readonly string[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <View style={styles.group}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.options}>
        {options.map((option) => (
          <Pressable
            key={option}
            accessibilityRole="radio"
            accessibilityState={{ selected: value === option }}
            onPress={() => onChange(option)}
            style={[styles.option, value === option && styles.optionSelected]}>
            <Text style={[styles.optionText, value === option && styles.optionTextSelected]}>{option}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    backgroundColor: Colors.surface,
    gap: 14,
  },
  title: {
    color: Colors.primary,
    fontSize: 15,
    fontFamily: 'Montserrat_700Bold',
  },
  group: { gap: 7 },
  label: {
    color: Colors.textMuted,
    fontSize: 13,
    fontFamily: 'Montserrat_600SemiBold',
  },
  options: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
  },
  option: {
    minHeight: 34,
    paddingHorizontal: 11,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    justifyContent: 'center',
  },
  optionSelected: {
    borderColor: Colors.secondary,
    backgroundColor: Colors.tertiary,
  },
  optionText: {
    color: Colors.text,
    fontSize: 12,
    fontFamily: 'Montserrat_500Medium',
  },
  optionTextSelected: {
    fontFamily: 'Montserrat_700Bold',
  },
});
