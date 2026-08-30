import { useRouter } from 'expo-router';
import { Image, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

const logo = require('../../assets/images/logo.png');

export default function LoginScreen() {
  const router = useRouter();

  const goToHome = () => {
    router.replace('/(tabs)/');
  };

  const goToRegister = () => {
    router.push('/(tabs)/register');
  };

  return (
    <View style={styles.container}>
      <View style={styles.logoContainer}>
        <Image source={logo} style={styles.logo} />
      </View>

      <View style={styles.inputContainer}>
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
      </View>

      <View style={styles.buttonsContainer}>
        <TouchableOpacity style={styles.loginButton} onPress={goToHome}>
          <Text style={styles.buttonText}>LOGIN</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.registerButton} onPress={goToRegister}>
          <Text style={styles.buttonText}>REGISTRARSE</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity onPress={goToRegister}>
        <Text style={styles.resetText}>¿REESTABLECER CONTRASEÑA?</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4F4F4',
    alignItems: 'center',
    paddingTop: 92,
  },
  logoContainer: {
    width: 239,
    height: 137,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 49,
  },
  logo: {
    width: 200,
    height: 100,
    resizeMode: 'contain',
  },
  inputContainer: {
    width: '80%',
    gap: 16,
    marginBottom: 41,
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
    width: 234,
    alignItems: 'center',
    gap: 21,
    marginBottom: 35,
  },
  loginButton: {
    width: 168,
    height: 46,
    backgroundColor: '#D5BFB3',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
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
    fontFamily: 'Montserrat',
    fontSize: 20,
    fontWeight: '400',
    color: '#000000',
    textAlign: 'center',
  },
  resetText: {
    fontFamily: 'Montserrat',
    fontSize: 15,
    fontWeight: '400',
    color: '#000000',
    textAlign: 'center',
    textDecorationLine: 'underline',
  },
});
