import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Colors, Radius } from '../../constants/theme';

interface ErrorViewProps {
  message: string;
  onRetry: () => void;
  /** Título; por defecto "Hubo un problema" (p. ej. "Sin conexión a Internet"). */
  title?: string;
}

export function ErrorView({ message, onRetry, title = 'Hubo un problema' }: ErrorViewProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>
      <Pressable onPress={onRetry} style={styles.button}>
        <Text style={styles.buttonText}>Reintentar</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 40,
    marginHorizontal: 24,
    padding: 18,
    borderRadius: Radius.lg,
    backgroundColor: Colors.dangerSoft,
    borderWidth: 1,
    borderColor: Colors.dangerBorder,
    alignItems: 'center',
    rowGap: 8,
  },
  title: {
    fontSize: 18,
    color: Colors.primary,
    fontFamily: 'Montserrat_700Bold',
  },
  message: {
    textAlign: 'center',
    color: Colors.text,
    fontSize: 14,
    fontFamily: 'Montserrat_400Regular',
  },
  button: {
    marginTop: 6,
    paddingHorizontal: 16,
    minHeight: 38,
    borderRadius: Radius.md,
    backgroundColor: Colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: Colors.textStrong,
    fontSize: 13,
    fontFamily: 'Montserrat_600SemiBold',
  },
});
