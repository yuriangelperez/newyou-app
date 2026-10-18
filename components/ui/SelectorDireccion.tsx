import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { Colors, FontSize, Radius, Spacing } from '../../constants/theme';
import { Direccion } from '../../services/direccionesService';
import { BotonGps } from './BotonGps';
import { VerEnMapa } from './VerEnMapa';

interface SelectorDireccionProps {
  direcciones: Direccion[];
  value: string;
  onChange: (direccion: string) => void;
  placeholder?: string;
}

/**
 * Elige una dirección guardada (la principal viene preseleccionada) o escribe una
 * nueva, con GPS opcional. Las nuevas se guardan desde la pantalla que lo usa.
 */
export function SelectorDireccion({
  direcciones,
  value,
  onChange,
  placeholder = 'Calle, número, ciudad',
}: SelectorDireccionProps) {
  const [modoNueva, setModoNueva] = useState(false);
  const sinGuardadas = direcciones.length === 0;

  // Preselecciona la principal cuando terminan de cargar las direcciones.
  useEffect(() => {
    if (!modoNueva && !value.trim() && direcciones.length > 0) {
      onChange((direcciones.find((item) => item.esPrincipal) ?? direcciones[0]).direccion);
    }
  }, [direcciones, modoNueva, value, onChange]);

  const mostrarInput = modoNueva || sinGuardadas;

  return (
    <View style={styles.wrapper}>
      {direcciones.map((item) => {
        const activa = !mostrarInput && value === item.direccion;

        return (
          <Pressable
            key={item.id}
            onPress={() => {
              setModoNueva(false);
              onChange(item.direccion);
            }}
            style={[styles.option, activa && styles.optionActive]}
          >
            <Text style={styles.optionText}>
              {item.alias ? `${item.alias}: ${item.direccion}` : item.direccion}
            </Text>
            {item.esPrincipal ? <Text style={styles.badge}>Principal</Text> : null}
          </Pressable>
        );
      })}

      {!sinGuardadas ? (
        <Pressable
          onPress={() => {
            setModoNueva(true);
            onChange('');
          }}
          style={[styles.option, modoNueva && styles.optionActive]}
        >
          <Text style={styles.optionText}>+ Nueva dirección</Text>
        </Pressable>
      ) : null}

      {mostrarInput ? (
        <View style={styles.nueva}>
          <TextInput
            value={value}
            onChangeText={onChange}
            placeholder={placeholder}
            placeholderTextColor={Colors.textMuted}
            style={styles.input}
          />
          <BotonGps onDireccion={onChange} />
        </View>
      ) : null}

      <VerEnMapa direccion={value} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { rowGap: Spacing.sm, marginBottom: Spacing.sm },
  option: {
    minHeight: 44,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.secondary,
    backgroundColor: Colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    columnGap: Spacing.sm,
  },
  optionActive: {
    backgroundColor: Colors.tertiary,
    shadowColor: Colors.secondary,
    shadowOffset: { width: 3, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 4,
    elevation: 4,
  },
  optionText: {
    flex: 1,
    color: Colors.primary,
    fontSize: FontSize.sm,
    fontFamily: 'Montserrat_500Medium',
  },
  badge: {
    color: Colors.secondary,
    fontSize: FontSize.xs,
    fontFamily: 'Montserrat_700Bold',
  },
  nueva: { rowGap: Spacing.sm },
  input: {
    minHeight: 44,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.secondary,
    backgroundColor: Colors.surface,
    color: Colors.text,
    fontSize: FontSize.md,
    fontFamily: 'Montserrat_400Regular',
  },
});
