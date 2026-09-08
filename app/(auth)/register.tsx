import { useState } from 'react';
import { useRouter } from 'expo-router';
import { Image, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

import { Colors, Radius } from '../../constants/theme';
import { signUpWithPassword } from '../../services/auth';

const logo = require('../../assets/images/logo.png');

export default function RegisterScreen() {
  const router = useRouter();
  const [correo, setCorreo] = useState('');
  const [usuario, setUsuario] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [repetirContrasena, setRepetirContrasena] = useState('');
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);

  const handleRegister = async () => {
    if (!correo.trim() || !usuario.trim() || !contrasena || !repetirContrasena) {
      setError('Completá todos los campos');
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo.trim())) {
      setError('Ingresá un correo válido');
      return;
    }

    if (usuario.trim().length < 3) {
      setError('El usuario debe tener al menos 3 caracteres');
      return;
    }

    if (contrasena.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres');
      return;
    }

    if (contrasena !== repetirContrasena) {
      setError('Las contraseñas no coinciden');
      return;
    }

    setError('');

    setCargando(true);
    try {
      const { error: authError } = await signUpWithPassword(
        correo.trim(),
        contrasena,
        usuario.trim(),
      );

      if (authError) {
        setError(authError.message);
        return;
      }

      router.replace('/(auth)/login');
    } finally {
      setCargando(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.logoContainer}>
        <Image source={logo} style={styles.logo} />
      </View>

      <Text style={styles.title}>REGISTRO DE USUARIO</Text>

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="CORREO"
          placeholderTextColor="#000000"
          keyboardType="email-address"
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
          placeholder="USUARIO"
          placeholderTextColor="#000000"
          autoCapitalize="none"
          autoCorrect={false}
          value={usuario}
          onChangeText={(value) => {
            setUsuario(value);
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
        <TextInput
          style={styles.input}
          placeholder="REPETIR CONTRASEÑA"
          placeholderTextColor="#000000"
          secureTextEntry
          value={repetirContrasena}
          onChangeText={(value) => {
            setRepetirContrasena(value);
            setError('');
          }}
        />
      </View>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <TouchableOpacity style={styles.registerButton} onPress={handleRegister} disabled={cargando}>
        <Text style={styles.buttonText}>{cargando ? 'CREANDO...' : 'REGISTRARSE'}</Text>
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
    fontFamily: 'Montserrat_600SemiBold',
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
    textAlignVertical: 'center',
    paddingHorizontal: 0,
    paddingVertical: 0,
    color: Colors.text,
    fontFamily: 'Montserrat_400Regular',
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
    fontFamily: 'Montserrat_600SemiBold',
  },
  errorText: {
    marginTop: -20,
    marginBottom: 20,
    color: Colors.danger,
    fontSize: 13,
    fontFamily: 'Montserrat_500Medium',
  },
});
