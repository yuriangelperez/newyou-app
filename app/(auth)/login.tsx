import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { BRANDING_LOGO } from '../../constants/assets';
import { ROUTES } from '../../constants/routes';
import { Colors, Radius } from '../../constants/theme';
import { signInWithPassword } from '../../services/auth';

export default function LoginScreen() {
  const router = useRouter();
  const [correo, setCorreo] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);
  const [mostrarContrasena, setMostrarContrasena] = useState(false);

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

      router.replace(ROUTES.home);
    } finally {
      setCargando(false);
    }
  };

  const goToRegister = () => {
    router.push(ROUTES.register);
  };

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
      <View style={styles.logoContainer}>
        <Image source={BRANDING_LOGO} style={styles.logo} />
      </View>

      <View style={styles.inputContainer}>
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>Correo</Text>
          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor={Colors.text}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            value={correo}
            onChangeText={(value) => {
              setCorreo(value);
              setError('');
            }}
          />
        </View>
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>Contraseña</Text>
          <View style={styles.passwordField}>
            <TextInput
              style={styles.passwordInput}
              placeholder="Contraseña"
              placeholderTextColor={Colors.text}
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
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  container: {
    flexGrow: 1,
    backgroundColor: Colors.background,
    alignItems: 'center',
    paddingTop: 92,
    paddingBottom: 36,
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
    gap: 18,
    marginBottom: 41,
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
  buttonsContainer: {
    width: 234,
    alignItems: 'center',
    gap: 21,
    marginBottom: 35,
  },
  errorText: {
    marginTop: -25,
    marginBottom: 20,
    color: Colors.danger,
    fontSize: 13,
    fontFamily: 'Montserrat_500Medium',
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
});
