import { useState } from 'react';
import { useRouter } from 'expo-router';
import { Image, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

import { Colors, Radius } from '../../constants/theme';
import { signInWithPassword } from '../../services/auth';

const logo = require('../../assets/images/logo.png');

export default function LoginScreen() {
  const router = useRouter();
  const [correo, setCorreo] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);

  const goToHome = async () => {
    if (!correo.trim() || !contrasena.trim()) {
      setError('Completá correo y contraseña');
      return;
    }

    setError('');

    setCargando(true);
    try {
      const { error: authError } = await signInWithPassword(correo.trim(), contrasena);

      if (authError) {
        setError(authError.message);
        return;
      }

      router.replace('/(tabs)/');
    } finally {
      setCargando(false);
    }
  };

  const goToRegister = () => {
    router.push('/register');
  };

  return (
    <View style={styles.container}>
      <View style={styles.logoContainer}>
        <Image source={logo} style={styles.logo} />
      </View>

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="CORREO"
          placeholderTextColor="#000000"
          autoCapitalize="none"
          autoCorrect={false}
          value={correo}
          onChangeText={(value) => {
            setCorreo(value);
            setError('');
          }}
        />
        <TextInput
          style={styles.input}
          placeholder="CONTRASEÑA"
          placeholderTextColor="#000000"
          secureTextEntry
          value={contrasena}
          onChangeText={(value) => {
            setContrasena(value);
            setError('');
          }}
        />
      </View>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <View style={styles.buttonsContainer}>
        <TouchableOpacity style={styles.loginButton} onPress={goToHome} disabled={cargando}>
          <Text style={styles.buttonText}>{cargando ? 'INGRESANDO...' : 'LOGIN'}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.registerButton} onPress={goToRegister} disabled={cargando}>
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
    backgroundColor: Colors.background,
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
    backgroundColor: Colors.backgroundMuted,
    borderRadius: Radius.md,
    fontSize: 20,
    textAlign: 'center',
    textAlignVertical: 'center',
    paddingHorizontal: 0,
    paddingVertical: 0,
    color: Colors.text,
    fontFamily: 'Montserrat_400Regular',
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
    backgroundColor: Colors.tertiary,
    borderRadius: Radius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  registerButton: {
    width: '100%',
    height: 46,
    backgroundColor: Colors.tertiary,
    borderRadius: Radius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 20,
    fontWeight: '400',
    color: Colors.text,
    textAlign: 'center',
    fontFamily: 'Montserrat_700Bold',
  },
  resetText: {
    fontSize: 15,
    fontWeight: '400',
    color: Colors.text,
    textAlign: 'center',
    fontFamily: 'Montserrat_700Bold',
  },
  errorText: {
    marginTop: -25,
    marginBottom: 20,
    color: Colors.danger,
    fontSize: 13,
    fontFamily: 'Montserrat_500Medium',
  },
});
