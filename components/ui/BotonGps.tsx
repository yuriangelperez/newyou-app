import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import Toast from 'react-native-toast-message';

import { Colors, FontSize, Radius, Spacing } from '../../constants/theme';
import { abrirDireccionEnMapa, obtenerDireccionActual } from '../../services/locationService';

// Más de este margen (en metros) ya no sirve para ubicar un domicilio o un local.
const PRECISION_ACEPTABLE = 200;

const formatearDistancia = (metros: number) =>
  metros >= 1000 ? `${(metros / 1000).toFixed(1)} km` : `${Math.round(metros)} m`;

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
    precisionMetros: number | null;
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
      precisionMetros: resultado.precisionMetros,
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
        <>
          <Text style={styles.hint}>
            {punto.soloCoordenadas
              ? 'No pudimos obtener la dirección, solo las coordenadas. Escribí la dirección a mano.'
              : 'Revisá que la dirección sea correcta: el GPS puede tener un margen de error.'}
          </Text>
          {punto.precisionMetros !== null ? (
            <Text style={[styles.hint, punto.precisionMetros > PRECISION_ACEPTABLE && styles.warning]}>
              {punto.precisionMetros > PRECISION_ACEPTABLE
                ? `Ubicación imprecisa (margen de ${formatearDistancia(punto.precisionMetros)}). Pasa en computadoras o con poca señal: escribí la dirección a mano.`
                : `Margen de error: ${formatearDistancia(punto.precisionMetros)}.`}
            </Text>
          ) : null}
          {/* Abre el punto exacto que tomó el GPS, no la dirección escrita. */}
          <Pressable
            accessibilityRole="link"
            onPress={() => void abrirDireccionEnMapa(`${punto.latitud},${punto.longitud}`)}
            style={styles.link}
          >
            <Text style={styles.linkText}>Ver la ubicación detectada en el mapa</Text>
          </Pressable>
        </>
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
  link: { alignSelf: 'flex-start', paddingVertical: 4 },
  linkText: {
    color: Colors.secondary,
    fontSize: FontSize.sm,
    fontFamily: 'Montserrat_700Bold',
    textDecorationLine: 'underline',
  },
  warning: { color: Colors.danger },
  hint: {
    color: Colors.textMuted,
    fontSize: FontSize.sm,
    fontFamily: 'Montserrat_500Medium',
  },
});
