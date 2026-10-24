import { useEffect, useState } from 'react';
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

import { TarjetaBienvenida } from '../../components/TarjetaBienvenida';
import { BRANDING_LOGO } from '../../constants/assets';
import { ROUTES } from '../../constants/routes';
import { Colors, Radius, Shadow } from '../../constants/theme';
import { useEsEscritorio } from '../../hooks/useEsEscritorio';
import { signInWithPassword } from '../../services/auth';
import { bienvenidaVista, marcarBienvenidaVista } from '../../services/bienvenidaService';

export default function LoginScreen() {
  const router = useRouter();
  // En la web de escritorio el formulario va en una tarjeta centrada.
  const esEscritorio = useEsEscritorio();
  const [correo, setCorreo] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);
  const [mostrarContrasena, setMostrarContrasena] = useState(false);
  const [mostrarBienvenida, setMostrarBienvenida] = useState(false);

  // La primera vez que se abre la app aparece la tarjeta de bienvenida.
  useEffect(() => {
    void bienvenidaVista().then((vista) => setMostrarBienvenida(!vista));
  }, []);

  const cerrarBienvenida = () => {
    setMostrarBienvenida(false);
    void marcarBienvenidaVista();
  };

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
        contentContainerStyle={[styles.container, esEscritorio && styles.containerEscritorio]}
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

      <TouchableOpacity onPress={() => router.push(ROUTES.forgotPassword)}>
        <Text style={styles.resetText}>¿OLVIDASTE TU CONTRASEÑA?</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => setMostrarBienvenida(true)}>
        <Text style={styles.welcomeText}>¿Qué es New You?</Text>
      </TouchableOpacity>
      </ScrollView>
      <TarjetaBienvenida visible={mostrarBienvenida} onCerrar={cerrarBienvenida} />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  containerEscritorio: {
    flexGrow: 0,
    alignSelf: 'center',
    width: 480,
    marginVertical: 48,
    paddingTop: 48,
    paddingHorizontal: 24,
    backgroundColor: Colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadow.card,
  },
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
    width: '85%',
    maxWidth: 400,
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
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.secondary,
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
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.secondary,
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
    backgroundColor: Colors.secondary,
    borderRadius: Radius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  registerButton: {
    width: '100%',
    height: 46,
    backgroundColor: Colors.secondary,
    borderRadius: Radius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 20,
    fontWeight: '400',
    color: Colors.white,
    textAlign: 'center',
    fontFamily: 'Montserrat_700Bold',
  },
  welcomeText: {
    marginTop: 18,
    fontSize: 14,
    color: Colors.primary,
    textAlign: 'center',
    textDecorationLine: 'underline',
    fontFamily: 'Montserrat_500Medium',
  },
  resetText: {
    fontSize: 15,
    fontWeight: '400',
    color: Colors.text,
    textAlign: 'center',
    fontFamily: 'Montserrat_700Bold',
  },
});
