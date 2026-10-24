import { Image, ImageStyle, Pressable, StyleProp, ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { PRODUCT_DETAIL_ICONS } from '../constants/assets';

interface BotonFavoritoProps {
  activo: boolean;
  onToggle: () => void;
  style?: StyleProp<ViewStyle>;
  iconStyle?: StyleProp<ImageStyle>;
}

/**
 * Corazón de favoritos con un "latido" de Reanimated (Clase 9): la escala vive en
 * un shared value del hilo de UI, así la animación no se traba si el JS está ocupado.
 */
export function BotonFavorito({ activo, onToggle, style, iconStyle }: BotonFavoritoProps) {
  const escala = useSharedValue(1);
  const estiloAnimado = useAnimatedStyle(() => ({
    transform: [{ scale: escala.value }],
  }));

  const onPress = () => {
    escala.set(
      withSequence(withTiming(1.25, { duration: 120 }), withSpring(1, { damping: 6, stiffness: 160 })),
    );
    onToggle();
  };

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={activo ? 'Quitar de favoritos' : 'Agregar a favoritos'}
      accessibilityState={{ selected: activo }}
      onPress={onPress}
      style={style}
      testID="boton-favorito"
    >
      <Animated.View style={estiloAnimado}>
        <Image
          source={activo ? PRODUCT_DETAIL_ICONS.favoriteOn : PRODUCT_DETAIL_ICONS.favoriteOff}
          style={iconStyle}
        />
      </Animated.View>
    </Pressable>
  );
}
