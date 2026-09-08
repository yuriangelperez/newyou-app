import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Image, Pressable, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

import { BRANDING_LOGO } from '../../constants/assets';
import { ROUTES } from '../../constants/routes';
import { Colors, Radius } from '../../constants/theme';
import { signUpWithPassword } from '../../services/auth';

export default function RegisterScreen() {
  const router = useRouter();
  const [correo, setCorreo] = useState('');
  const [usuario, setUsuario] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [repetirContrasena, setRepetirContrasena] = useState('');
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);
  const [mostrarContrasena, setMostrarContrasena] = useState(false);
  const [mostrarRepetirContrasena, setMostrarRepetirContrasena] = useState(false);

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

      router.replace(ROUTES.login);
    } finally {
      setCargando(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.logoContainer}>
        <Image source={BRANDING_LOGO} style={styles.logo} />
      </View>

      <Text style={styles.title}>REGISTRO DE USUARIO</Text>

      <View style={styles.inputContainer}>
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>Correo</Text>
          <TextInput
            style={styles.input}
            placeholder="tu@email.com"
            placeholderTextColor={Colors.textMuted}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            value={correo}
            onChangeText={(value) => {
              setCorreo(value);
              setError('');
            }}
          />
        </View>
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>Usuario</Text>
          <TextInput
            style={styles.input}
            placeholder="Elegí tu nombre de usuario"
            placeholderTextColor={Colors.textMuted}
            autoCapitalize="none"
            autoCorrect={false}
            value={usuario}
            onChangeText={(value) => {
              setUsuario(value);
              setError('');
            }}
          />
        </View>
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>Contraseña</Text>
          <View style={styles.passwordField}>
            <TextInput
              style={styles.passwordInput}
              placeholder="Mínimo 6 caracteres"
              placeholderTextColor={Colors.textMuted}
              secureTextEntry={!mostrarContrasena}
              value={contrasena}
              onChangeText={(value) => {
                setContrasena(value);
                setError('');
              }}
            />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={mostrarContrasena ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              style={styles.eyeButton}
              onPress={() => setMostrarContrasena((value) => !value)}>
              <Ionicons
                name={mostrarContrasena ? 'eye-off-outline' : 'eye-outline'}
                size={20}
                color={Colors.textMuted}
              />
            </Pressable>
          </View>
        </View>
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>Repetir contraseña</Text>
          <View style={styles.passwordField}>
            <TextInput
              style={styles.passwordInput}
              placeholder="Repetí tu contraseña"
              placeholderTextColor={Colors.textMuted}
              secureTextEntry={!mostrarRepetirContrasena}
              value={repetirContrasena}
              onChangeText={(value) => {
                setRepetirContrasena(value);
                setError('');
              }}
            />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={mostrarRepetirContrasena ? 'Ocultar contraseña repetida' : 'Mostrar contraseña repetida'}
              style={styles.eyeButton}
              onPress={() => setMostrarRepetirContrasena((value) => !value)}>
              <Ionicons
                name={mostrarRepetirContrasena ? 'eye-off-outline' : 'eye-outline'}
                size={20}
                color={Colors.textMuted}
              />
            </Pressable>
          </View>
        </View>
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
    gap: 18,
    marginBottom: 35,
  },
  fieldGroup: {
    gap: 8,
  },
  fieldLabel: {
    color: Colors.primary,
    fontSize: 14,
    paddingLeft: 4,
    fontFamily: 'Montserrat_600SemiBold',
  },
  errorText: {
    marginTop: -20,
    marginBottom: 20,
    color: Colors.danger,
    fontSize: 13,
    fontFamily: 'Montserrat_500Medium',
  },
  input: {
    width: '100%',
    height: 56,
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    fontSize: 16,
    textAlign: 'left',
    paddingHorizontal: 18,
    color: Colors.text,
    fontFamily: 'Montserrat_400Regular',
  },
  passwordField: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingLeft: 18,
    paddingRight: 10,
  },
  passwordInput: {
    flex: 1,
    height: 56,
    fontSize: 16,
    color: Colors.text,
    fontFamily: 'Montserrat_400Regular',
  },
  eyeButton: {
    width: 38,
    height: 38,
    justifyContent: 'center',
    alignItems: 'center',
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
});
