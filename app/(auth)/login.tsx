import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';
import { useRouter } from 'expo-router';
import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';

import { TarjetaBienvenida } from '../../components/TarjetaBienvenida';
import { BRANDING_LOGO } from '../../constants/assets';
import { ROUTES } from '../../constants/routes';
import { Colors, Radius, Shadow } from '../../constants/theme';
import { useEsEscritorio } from '../../hooks/useEsEscritorio';
import { LoginForm, loginSchema } from '../../schemas/authSchemas';
import { signInWithPassword } from '../../services/auth';

export default function LoginScreen() {
  const router = useRouter();
  // En la web de escritorio el formulario va en una tarjeta centrada.
  const esEscritorio = useEsEscritorio();
  const [errorServidor, setErrorServidor] = useState('');
  const [mostrarContrasena, setMostrarContrasena] = useState(false);
  // La tarjeta del primer inicio vive en el layout raíz; acá sólo se vuelve a abrir.
  const [mostrarBienvenida, setMostrarBienvenida] = useState(false);
  // RHF + Zod (Clase 8): se valida en el cliente antes de llamar a Supabase.
  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { correo: '', contrasena: '' },
  });
  const error = errors.correo?.message ?? errors.contrasena?.message ?? errorServidor;
  const cargando = isSubmitting;

  const goToHome = handleSubmit(async ({ correo, contrasena }) => {
    setErrorServidor('');
    const { error: authError } = await signInWithPassword(correo, contrasena);

    if (authError) {
      setErrorServidor(authError.message);
      return;
    }

    router.replace(ROUTES.home);
  });

  const goToRegister = () => {
    router.push(ROUTES.register);
  };

  return (
    <View style={styles.screen}>
      <KeyboardAwareScrollView bottomOffset={24}
        contentContainerStyle={[styles.container, esEscritorio && styles.containerEscritorio]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
      <View style={styles.logoContainer}>
        <Image source={BRANDING_LOGO} style={styles.logo} />
      </View>

      <View style={styles.inputContainer}>
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>Correo</Text>
          <Controller
            control={control}
            name="correo"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                testID="login-correo"
                style={styles.input}
                placeholder="Email"
                placeholderTextColor={Colors.text}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                value={value}
                onBlur={onBlur}
                onChangeText={(texto) => {
                  onChange(texto);
                  setErrorServidor('');
                }}
              />
            )}
          />
        </View>
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>Contraseña</Text>
          <View style={styles.passwordField}>
            <Controller
              control={control}
              name="contrasena"
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  testID="login-contrasena"
                  style={styles.passwordInput}
                  placeholder="Contraseña"
                  placeholderTextColor={Colors.text}
                  secureTextEntry={!mostrarContrasena}
                  value={value}
                  onBlur={onBlur}
                  onChangeText={(texto) => {
                    onChange(texto);
                    setErrorServidor('');
                  }}
                />
              )}
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

      {error ? (
        <Text style={styles.errorText} testID="login-error">
          {error}
        </Text>
      ) : null}

      <View style={styles.buttonsContainer}>
        <TouchableOpacity
          testID="login-boton"
          style={styles.loginButton}
          onPress={() => void goToHome()}
          disabled={cargando}>
          <Text style={styles.buttonText}>{cargando ? 'INGRESANDO...' : 'LOGIN'}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          testID="login-ir-registro"
          style={styles.registerButton}
          onPress={goToRegister}
          disabled={cargando}>
          <Text style={styles.buttonText}>REGISTRARSE</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity onPress={() => router.push(ROUTES.forgotPassword)}>
        <Text style={styles.resetText}>¿OLVIDASTE TU CONTRASEÑA?</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => setMostrarBienvenida(true)}>
        <Text style={styles.welcomeText}>¿Qué es New You?</Text>
      </TouchableOpacity>
      </KeyboardAwareScrollView>
      <TarjetaBienvenida visible={mostrarBienvenida} onCerrar={() => setMostrarBienvenida(false)} />
    </View>
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
