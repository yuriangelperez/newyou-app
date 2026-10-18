import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import Toast from 'react-native-toast-message';

import { Colors, FontSize, Radius, Spacing } from '../../constants/theme';
import { obtenerDireccionActual } from '../../services/locationService';

interface BotonGpsProps {
  /** Recibe la dirección detectada para que la pantalla la cargue en su campo. */
  onDireccion: (direccion: string) => void;
}

/**
 * Botón "Usar mi ubicación (GPS)". Tras detectar la ubicación muestra un enlace
 * para verla en el mapa y un aviso para revisar la dirección; si el GPS falla,
 * avisa y deja la carga manual.
 */
export function BotonGps({ onDireccion }: BotonGpsProps) {
  const [buscando, setBuscando] = useState(false);
  const [punto, setPunto] = useState<{
    latitud: number;
    longitud: number;
    soloCoordenadas: boolean;
  } | null>(null);

  const onPress = async () => {
    setBuscando(true);
    const resultado = await obtenerDireccionActual();
    setBuscando(false);

    if (!resultado.ok) {
      Toast.show({
        type: 'info',
        text1: 'No se pudo usar el GPS',
        text2: `${resultado.motivo} Ingresa la dirección manualmente.`,
      });
      return;
    }

    setPunto({
      latitud: resultado.latitud,
      longitud: resultado.longitud,
      soloCoordenadas: resultado.soloCoordenadas,
    });
    onDireccion(resultado.direccion);
  };

  return (
    <View style={styles.wrapper}>
      <Pressable disabled={buscando} onPress={() => void onPress()} style={styles.button}>
        {buscando ? (
          <ActivityIndicator color={Colors.secondary} />
        ) : (
          <Text style={styles.buttonText}>Usar mi ubicación (GPS)</Text>
        )}
      </Pressable>

      {punto ? (
        <Text style={styles.hint}>
          {punto.soloCoordenadas
            ? 'No pudimos obtener la dirección, solo las coordenadas. Escribí la dirección a mano.'
            : 'Revisá que la dirección sea correcta: el GPS puede tener un margen de error.'}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { rowGap: Spacing.xs, marginBottom: Spacing.sm },
  button: {
    alignSelf: 'flex-start',
    minHeight: 36,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.secondary,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: Colors.secondary,
    fontSize: FontSize.sm,
    fontFamily: 'Montserrat_600SemiBold',
  },
  hint: {
    color: Colors.textMuted,
    fontSize: FontSize.sm,
    fontFamily: 'Montserrat_500Medium',
  },
});
