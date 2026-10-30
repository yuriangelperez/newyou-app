import { useState } from 'react';
import { Control, useController } from 'react-hook-form';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import {
  GRUPOS_CATEGORIA,
  GrupoCategoria,
  PUBLICOS,
  TEMPORADAS,
  tipoPrendaDeCategoria,
} from '../../constants/categoriasProductos';
import { useCategorias } from '../../hooks/useCategorias';
import { Colors, Radius } from '../../constants/theme';
import { ProductoFormValues } from '../../schemas/productoSchema';

interface CategoriaProductoSelectorProps {
  control: Control<ProductoFormValues>;
}

const CATEGORY_GROUP_FILTERS = ['TODO', ...GRUPOS_CATEGORIA] as const;
type CategoryGroupFilter = (typeof CATEGORY_GROUP_FILTERS)[number];

export function CategoriaProductoSelector({ control }: CategoriaProductoSelectorProps) {
  const tipoPrenda = useController({ control, name: 'tipoPrenda' });
  const categoria = useController({ control, name: 'categoria' });
  const temporada = useController({ control, name: 'temporada' });
  const publico = useController({ control, name: 'publico' });
  const categorias = useCategorias();
  const [grupoActivo, setGrupoActivo] = useState<CategoryGroupFilter>('TODO');

  const categoriasVisibles =
    grupoActivo === 'TODO'
      ? categorias
      : categorias.filter((item) => item.grupo === (grupoActivo as GrupoCategoria));

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Categoría de la prenda</Text>

      <View style={styles.group}>
        <Text style={styles.label}>Buscar por grupo</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
          {CATEGORY_GROUP_FILTERS.map((filtro) => (
            <Pressable
              key={filtro}
              accessibilityRole="button"
              accessibilityState={{ selected: grupoActivo === filtro }}
              onPress={() => setGrupoActivo(filtro)}
              style={[styles.filterChip, grupoActivo === filtro && styles.filterChipSelected]}>
              <Text style={[styles.filterText, grupoActivo === filtro && styles.filterTextSelected]}>{filtro}</Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      <View style={styles.group}>
        <Text style={styles.label}>Categoría</Text>
        <View style={styles.options}>
          {categoriasVisibles.map((item) => (
            <Pressable
              key={item.nombre}
              accessibilityRole="radio"
              accessibilityState={{ selected: categoria.field.value === item.nombre }}
              onPress={() => {
                categoria.field.onChange(item.nombre);
                const grupo = categorias.find((categoriaItem) => categoriaItem.nombre === item.nombre)?.grupo;
                setGrupoActivo(grupo ?? 'TODO');
                tipoPrenda.field.onChange(tipoPrendaDeCategoria(item.nombre, grupo));
              }}
              style={[styles.option, categoria.field.value === item.nombre && styles.optionSelected]}>
              <Text style={[styles.optionText, categoria.field.value === item.nombre && styles.optionTextSelected]}>
                {item.nombre}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      <OptionGroup label="Temporada" options={TEMPORADAS} value={temporada.field.value} onChange={temporada.field.onChange} />
      <OptionGroup
        label="Público"
        options={PUBLICOS}
        value={Array.isArray(publico.field.value) ? publico.field.value : []}
        onChange={(nextValue) => publico.field.onChange(nextValue)}
        multiSelect
      />
    </View>
  );
}

function OptionGroup({
  label,
  options,
  value,
  onChange,
  multiSelect = false,
}: {
  label: string;
  options: readonly string[];
  value: string | readonly string[];
  onChange: (value: string | string[]) => void;
  multiSelect?: boolean;
}) {
  const selected = (Array.isArray(value) ? value : [value]).filter(Boolean);

  return (
    <View style={styles.group}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.options}>
        {options.map((option) => {
          const isSelected = multiSelect ? selected.includes(option) : value === option;

          return (
            <Pressable
              key={option}
              accessibilityRole={multiSelect ? 'checkbox' : 'radio'}
              accessibilityState={{ selected: isSelected }}
              onPress={() => {
                if (!multiSelect) {
                  onChange(option);
                  return;
                }

                const nextValue = isSelected
                  ? selected.filter((item) => item !== option)
                  : [...selected, option];
                onChange(nextValue);
              }}
              style={[styles.option, isSelected && styles.optionSelected]}>
              <Text style={[styles.optionText, isSelected && styles.optionTextSelected]}>{option}</Text>
            </Pressable>
          );
        })}
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
  filterScroll: {
    paddingRight: 4,
    gap: 7,
  },
  filterChip: {
    minHeight: 32,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.background,
    justifyContent: 'center',
  },
  filterChipSelected: {
    borderColor: Colors.secondary,
    backgroundColor: Colors.tertiary,
  },
  filterText: {
    color: Colors.text,
    fontSize: 11,
    fontFamily: 'Montserrat_600SemiBold',
    textTransform: 'uppercase',
  },
  filterTextSelected: {
    color: Colors.primary,
    fontFamily: 'Montserrat_700Bold',
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
