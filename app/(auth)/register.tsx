import { useRouter } from 'expo-router';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

import { Colors, Radius } from '../../constants/theme';

export default function RegisterScreen() {
  const router = useRouter();

  const goToHome = () => {
    router.replace('/(tabs)/');
  };

  const goToLogin = () => {
    router.replace('/login');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>REGISTRARSE</Text>

      <View style={styles.inputContainer}>
        <TextInput style={styles.input} placeholder="NOMBRE" placeholderTextColor="#000" />
        <TextInput style={styles.input} placeholder="EMAIL" placeholderTextColor="#000" />
        <TextInput
          style={styles.input}
          placeholder="CONTRASEÑA"
          placeholderTextColor="#000"
          secureTextEntry
        />
      </View>

      <View style={styles.buttonsContainer}>
        <TouchableOpacity style={styles.registerButton} onPress={goToHome}>
          <Text style={styles.buttonText}>REGISTRAR</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={goToLogin}>
          <Text style={styles.link}>YA TENGO CUENTA</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
    padding: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    marginBottom: 24,
    color: Colors.primary,
  },
  inputContainer: {
    width: '100%',
    gap: 16,
    marginBottom: 24,
  },
  input: {
    width: '100%',
    height: 58,
    backgroundColor: Colors.backgroundMuted,
    borderRadius: Radius.md,
    fontSize: 20,
    textAlign: 'center',
    color: Colors.text,
  },
  buttonsContainer: {
    width: '100%',
    alignItems: 'center',
    gap: 16,
  },
  registerButton: {
    width: '100%',
    height: 46,
    backgroundColor: Colors.secondary,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.primary,
  },
  link: {
    color: Colors.primary,
    fontSize: 16,
    textDecorationLine: 'underline',
  },
});
