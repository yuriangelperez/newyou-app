import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Colors, Radius } from '../../constants/theme';

interface ErrorViewProps {
  message: string;
  onRetry: () => void;
}

export function ErrorView({ message, onRetry }: ErrorViewProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Hubo un problema</Text>
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
    backgroundColor: '#FFF3F3',
    borderWidth: 1,
    borderColor: '#F5B5B5',
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
    color: '#2D1F16',
    fontSize: 13,
    fontFamily: 'Montserrat_600SemiBold',
  },
});
