import { useRouter } from 'expo-router';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

export default function RegisterScreen() {
  const router = useRouter();

  const goToHome = () => {
    router.replace('/(tabs)/');
  };

  const goToLogin = () => {
    router.back();
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
    backgroundColor: '#F4F4F4',
    padding: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    marginBottom: 24,
  },
  inputContainer: {
    width: '100%',
    gap: 16,
    marginBottom: 24,
  },
  input: {
    width: '100%',
    height: 58,
    backgroundColor: '#D9D9D9',
    borderRadius: 10,
    fontSize: 20,
    textAlign: 'center',
    color: '#000000',
  },
  buttonsContainer: {
    width: '100%',
    alignItems: 'center',
    gap: 16,
  },
  registerButton: {
    width: '100%',
    height: 46,
    backgroundColor: '#D5BFB3',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000000',
  },
  link: {
    color: '#493628',
    fontSize: 16,
    textDecorationLine: 'underline',
  },
});
