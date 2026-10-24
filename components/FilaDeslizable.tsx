import { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { Colors, FontSize, Radius } from '../constants/theme';

// Cuánto hay que deslizar a la izquierda para pedir el borrado.
const UMBRAL = -100;

interface FilaDeslizableProps {
  children: ReactNode;
  /** Se llama al soltar pasado el umbral (la pantalla confirma y borra). */
  onEliminar: () => void;
}

/**
 * Deslizar para borrar (Clase 9): gesture-handler + Reanimated. El arrastre corre
 * en el hilo de UI; `scheduleOnRN` (el `runOnJS` de Reanimated 4) vuelve al hilo de
 * JS para pedir la confirmación y llamar al servicio de borrado.
 */
export function FilaDeslizable({ children, onEliminar }: FilaDeslizableProps) {
  const desplazamiento = useSharedValue(0);

  const arrastre = Gesture.Pan()
    // Sólo horizontal: el scroll vertical de la lista sigue funcionando.
    .activeOffsetX([-15, 15])
    .failOffsetY([-10, 10])
    .onUpdate((evento) => {
      desplazamiento.value = Math.min(0, evento.translationX);
    })
    .onEnd(() => {
      if (desplazamiento.value < UMBRAL) {
        scheduleOnRN(onEliminar);
      }
      // Vuelve a su lugar: si se confirma el borrado, la fila desaparece de la lista.
      desplazamiento.value = withSpring(0);
    });

  const estiloFila = useAnimatedStyle(() => ({
    transform: [{ translateX: desplazamiento.value }],
  }));

  return (
    <View style={styles.contenedor}>
      <View style={styles.fondo} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <Text style={styles.textoFondo}>Eliminar</Text>
      </View>
      <GestureDetector gesture={arrastre}>
        <Animated.View style={estiloFila}>{children}</Animated.View>
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: { position: 'relative' },
  fondo: {
    ...StyleSheet.absoluteFill,
    borderRadius: Radius.md,
    backgroundColor: Colors.danger,
    alignItems: 'flex-end',
    justifyContent: 'center',
    paddingRight: 24,
  },
  textoFondo: { color: Colors.white, fontSize: FontSize.sm, fontFamily: 'Montserrat_700Bold' },
});
