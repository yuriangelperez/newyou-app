import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { Colors, Radius } from '../../constants/theme';
import { leerMontoFiltro, RANGOS_RAPIDOS } from '../../utils/filtrosCatalogo';

interface FiltroPrecioProps {
  min: number | null;
  max: number | null;
  onCambiar: (min: number | null, max: number | null) => void;
}

const mostrar = (valor: number | null) => (valor === null ? '' : valor.toLocaleString('es-AR'));

/** Rango de precio: atajos en chips y un mínimo/máximo que se puede escribir. */
export function FiltroPrecio({ min, max, onCambiar }: FiltroPrecioProps) {
  // Texto de los campos; se sincroniza cuando el rango cambia desde afuera (atajo o Limpiar).
  const [textoMin, setTextoMin] = useState(mostrar(min));
  const [textoMax, setTextoMax] = useState(mostrar(max));
  const [ultimo, setUltimo] = useState({ min, max });
  if (ultimo.min !== min || ultimo.max !== max) {
    setUltimo({ min, max });
    if (leerMontoFiltro(textoMin) !== min) setTextoMin(mostrar(min));
    if (leerMontoFiltro(textoMax) !== max) setTextoMax(mostrar(max));
  }

  const alReves = min !== null && max !== null && min > max;

  return (
    <View style={styles.contenedor}>
      <View style={styles.chips}>
        {RANGOS_RAPIDOS.map(({ texto, rango }) => {
          const elegido = rango.min === min && rango.max === max;
          return (
            <Pressable
              key={texto}
              testID={`precio-${texto}`}
              accessibilityRole="radio"
              accessibilityState={{ checked: elegido }}
              style={[styles.chip, elegido && styles.chipElegido]}
              onPress={() => (elegido ? onCambiar(null, null) : onCambiar(rango.min, rango.max))}>
              <Text style={[styles.chipTexto, elegido && styles.chipTextoElegido]}>{texto}</Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.campos}>
        <View style={styles.campo}>
          <Text style={styles.signo}>$</Text>
          <TextInput
            testID="precio-min"
            accessibilityLabel="Precio mínimo"
            style={styles.input}
            placeholder="Mínimo"
            placeholderTextColor={Colors.textMuted}
            keyboardType="number-pad"
            value={textoMin}
            onChangeText={(texto) => {
              const valor = leerMontoFiltro(texto);
              setTextoMin(mostrar(valor));
              onCambiar(valor, max);
            }}
          />
        </View>
        <Text style={styles.guion}>–</Text>
        <View style={styles.campo}>
          <Text style={styles.signo}>$</Text>
          <TextInput
            testID="precio-max"
            accessibilityLabel="Precio máximo"
            style={styles.input}
            placeholder="Máximo"
            placeholderTextColor={Colors.textMuted}
            keyboardType="number-pad"
            value={textoMax}
            onChangeText={(texto) => {
              const valor = leerMontoFiltro(texto);
              setTextoMax(mostrar(valor));
              onCambiar(min, valor);
            }}
          />
        </View>
      </View>
      {alReves ? <Text style={styles.aviso}>El mínimo es mayor que el máximo: se busca entre los dos igual.</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: {
    paddingHorizontal: 18,
    paddingVertical: 4,
    rowGap: 10,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    height: 34,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.tertiary,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  chipElegido: {
    backgroundColor: Colors.secondary,
    borderColor: Colors.secondary,
  },
  chipTexto: {
    color: Colors.text,
    fontSize: 13,
    fontFamily: 'Montserrat_500Medium',
  },
  chipTextoElegido: {
    color: Colors.white,
    fontFamily: 'Montserrat_600SemiBold',
  },
  campos: {
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: 8,
  },
  campo: {
    flex: 1,
    height: 42,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.tertiary,
    backgroundColor: Colors.surface,
    paddingHorizontal: 10,
  },
  signo: {
    color: Colors.textEarth,
    fontSize: 14,
    marginRight: 4,
    fontFamily: 'Montserrat_500Medium',
  },
  input: {
    flex: 1,
    height: 40,
    color: Colors.text,
    fontSize: 14,
    fontFamily: 'Montserrat_400Regular',
  },
  guion: {
    color: Colors.textEarth,
    fontSize: 16,
  },
  aviso: {
    color: Colors.warning,
    fontSize: 12,
    fontFamily: 'Montserrat_500Medium',
  },
});
