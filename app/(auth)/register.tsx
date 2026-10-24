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

import { BRANDING_LOGO } from '../../constants/assets';
import { ROUTES } from '../../constants/routes';
import { Colors, Radius, Shadow } from '../../constants/theme';
import { useEsEscritorio } from '../../hooks/useEsEscritorio';
import { RegisterForm, registerSchema } from '../../schemas/authSchemas';
import { signUpWithPassword } from '../../services/auth';

export default function RegisterScreen() {
  const router = useRouter();
  // En la web de escritorio el formulario va en una tarjeta centrada.
  const esEscritorio = useEsEscritorio();
  const [errorServidor, setErrorServidor] = useState('');
  const [mostrarContrasena, setMostrarContrasena] = useState(false);
  const [mostrarRepetirContrasena, setMostrarRepetirContrasena] = useState(false);
  // RHF + Zod (Clase 8): `.refine()` valida que las dos contraseñas coincidan.
  const {
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      correo: '',
      usuario: '',
      contrasena: '',
      repetirContrasena: '',
      quiereVender: false,
    },
  });
  const quiereVender = watch('quiereVender');
  const setQuiereVender = (valor: boolean) => setValue('quiereVender', valor);
  const error =
    errors.correo?.message ??
    errors.usuario?.message ??
    errors.contrasena?.message ??
    errors.repetirContrasena?.message ??
    errorServidor;
  const cargando = isSubmitting;

  const handleRegister = handleSubmit(async (datos) => {
    setErrorServidor('');
    const { error: authError } = await signUpWithPassword(
      datos.correo,
      datos.contrasena,
      datos.usuario,
      datos.quiereVender ? 'particular' : 'comprador',
    );

    if (authError) {
      setErrorServidor(authError.message);
      return;
    }

    router.replace(ROUTES.login);
  });

  return (
    <View style={styles.screen}>
      <KeyboardAwareScrollView bottomOffset={24}
        contentContainerStyle={[styles.container, esEscritorio && styles.containerEscritorio]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
      <View style={styles.logoContainer}>
        <Image source={BRANDING_LOGO} style={styles.logo} />
      </View>

      <Text style={styles.title}>REGISTRO DE USUARIO</Text>

      <View style={styles.inputContainer}>
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>Correo</Text>
          <Controller
            control={control}
            name="correo"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                testID="registro-correo"
                style={styles.input}
                placeholder="tu@email.com"
                placeholderTextColor={Colors.textMuted}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
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
          <Text style={styles.fieldLabel}>Usuario</Text>
          <Controller
            control={control}
            name="usuario"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                testID="registro-usuario"
                style={styles.input}
                placeholder="Elegí tu nombre de usuario"
                placeholderTextColor={Colors.textMuted}
                autoCapitalize="none"
                autoCorrect={false}
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
                  testID="registro-contrasena"
                  style={styles.passwordInput}
                  placeholder="6+ caracteres, una mayúscula y un número"
                  placeholderTextColor={Colors.textMuted}
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
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>Repetir contraseña</Text>
          <View style={styles.passwordField}>
            <Controller
              control={control}
              name="repetirContrasena"
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  testID="registro-repetir"
                  style={styles.passwordInput}
                  placeholder="Repetí tu contraseña"
                  placeholderTextColor={Colors.textMuted}
                  secureTextEntry={!mostrarRepetirContrasena}
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
        <View style={styles.roleGroup}>
          <Text style={styles.fieldLabel}>¿Querés vender prendas?</Text>
          <View style={styles.roleOptions}>
            <Pressable
              accessibilityRole="radio"
              accessibilityState={{ selected: !quiereVender }}
              onPress={() => setQuiereVender(false)}
              style={[styles.roleOption, !quiereVender && styles.roleOptionSelected]}>
              <Text style={styles.roleOptionText}>No, quiero comprar</Text>
            </Pressable>
            <Pressable
              accessibilityRole="radio"
              accessibilityState={{ selected: quiereVender }}
              onPress={() => setQuiereVender(true)}
              style={[styles.roleOption, quiereVender && styles.roleOptionSelected]}>
              <Text style={styles.roleOptionText}>Sí, quiero vender</Text>
            </Pressable>
          </View>
        </View>
      </View>

      {error ? (
        <Text style={styles.errorText} testID="registro-error">
          {error}
        </Text>
      ) : null}

      <TouchableOpacity
        testID="registro-boton"
        style={styles.registerButton}
        onPress={() => void handleRegister()}
        disabled={cargando}>
        <Text style={styles.buttonText}>{cargando ? 'CREANDO...' : 'REGISTRARSE'}</Text>
      </TouchableOpacity>
      </KeyboardAwareScrollView>
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
    paddingTop: 50,
    paddingBottom: 32,
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
    width: '85%',
    maxWidth: 420,
    gap: 18,
    marginBottom: 35,
  },
  fieldGroup: {
    gap: 8,
  },
  roleGroup: {
    gap: 8,
  },
  roleOptions: {
    flexDirection: 'row',
    gap: 8,
  },
  roleOption: {
    flex: 1,
    minHeight: 46,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.secondary,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  roleOptionSelected: {
    borderColor: Colors.secondary,
    backgroundColor: Colors.tertiary,
  },
  roleOptionText: {
    color: Colors.text,
    fontSize: 12,
    textAlign: 'center',
    fontFamily: 'Montserrat_600SemiBold',
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
  registerButton: {
    width: '85%',
    maxWidth: 420,
    height: 46,
    backgroundColor: Colors.secondary,
    borderRadius: Radius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 20,
    color: Colors.white,
    textAlign: 'center',
    fontFamily: 'Montserrat_700Bold',
  },
});
