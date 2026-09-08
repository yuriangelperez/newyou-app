import { useRouter } from 'expo-router';
import { Image, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

import { BRANDING_LOGO } from '../../constants/assets';
import { ROUTES } from '../../constants/routes';
import { Colors, Radius } from '../../constants/theme';

export default function RegisterScreen() {
  const router = useRouter();

  const handleRegister = () => {
    router.replace(ROUTES.login);
  };

  return (
    <View style={styles.container}>
      <View style={styles.logoContainer}>
        <Image source={BRANDING_LOGO} style={styles.logo} />
      </View>

      <Text style={styles.title}>REGISTRO DE USUARIO</Text>

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="CORREO"
          placeholderTextColor="#000000"
          keyboardType="email-address"
          autoCapitalize="none"
        />
        <TextInput
          style={styles.input}
          placeholder="USUARIO"
          placeholderTextColor="#000000"
          autoCapitalize="none"
        />
        <TextInput
          style={styles.input}
          placeholder="CONTRASEÑA"
          placeholderTextColor="#000000"
          secureTextEntry
        />
        <TextInput
          style={styles.input}
          placeholder="REPETIR CONTRASEÑA"
          placeholderTextColor="#000000"
          secureTextEntry
        />
      </View>

      <TouchableOpacity style={styles.registerButton} onPress={handleRegister}>
        <Text style={styles.buttonText}>REGISTRARSE</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: 'center',
    paddingTop: 50,
  },
  logoContainer: {
    width: 105,
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 30,
  },
  logo: {
    width: 80,
    height: 40,
    resizeMode: 'contain',
  },
  title: {
    fontSize: 22,
    fontWeight: '600',
    color: Colors.secondary,
    marginBottom: 45,
    fontFamily: 'Montserrat',
  },
  inputContainer: {
    width: '80%',
    gap: 16,
    marginBottom: 35,
  },
  input: {
    width: '100%',
    height: 58,
    backgroundColor: Colors.backgroundMuted,
    borderRadius: Radius.md,
    fontSize: 20,
    textAlign: 'center',
    color: Colors.text,
    fontFamily: 'Montserrat',
  },
  registerButton: {
    width: '80%',
    height: 46,
    backgroundColor: Colors.tertiary,
    borderRadius: Radius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.text,
    textAlign: 'center',
    fontFamily: 'Montserrat',
  },
});
