import React from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { Colors, Spacing, FontSize, Radius } from '../../constants/theme';
const logo = require('../../assets/images/logo.png');

export default function LoginScreen() {
  const handleLogin = () => {
    console.log('Login click');
  };

  const handleRegister = () => {
    console.log('Registrarse click');
  };

  const handleResetPassword = () => {
    console.log('Reestablecer contraseña click');
  };

  return (
    <View style={styles.container}>
      {/* Logo NEW YOU*/}
      <View style={styles.logoContainer}>
        <Image
          source={logo}
          style={{ width: 200, height: 100 }}
        />
      </View>

      {/* Inputs de Usuario y Contraseña */}
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

      {/* Botones de Login y Registrarse */}
      <View style={styles.buttonsContainer}>
        <TouchableOpacity style={styles.loginButton} onPress={handleLogin}>
          <Text style={styles.buttonText}>LOGIN</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.registerButton} onPress={handleRegister}>
          <Text style={styles.buttonText}>REGISTRARSE</Text>
        </TouchableOpacity>
      </View>

      {/* Enlace de Reestablecer Contraseña */}
      <TouchableOpacity onPress={handleResetPassword} style={styles.resetContainer}>
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
    paddingTop: 92, // Basado en el top del diseño de Figma
  },
  logoContainer: {
    width: 239,
    height: 137,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 49, // Espacio para llegar a la zona de inputs (278px iniciales)
  },
  logoText: {
    fontFamily: 'Montserrat',
    fontSize: 40,
    fontWeight: '400',
    color: '#000000',
    letterSpacing: 2,
  },
  logoSlash: {
    color: '#000000',
  },
  inputContainer: {
    width: 56,
    gap: 16, // Espacio entre el input de usuario y contraseña
    marginBottom: 41,
  },
  input: {
    width: '100%',
    height: 58,
    backgroundColor: '#D9D9D9',
    borderRadius: Radius.md || 10,
    fontFamily: 'Montserrat',
    fontSize: 20,
    textAlign: 'center',
    color: '#000000',
  },
  buttonsContainer: {
    width: 234,
    alignItems: 'center',
    gap: 21, // Espacio entre el botón de LOGIN y REGISTRARSE
    marginBottom: 35,
  },
  loginButton: {
    width: 168,
    height: 46,
    backgroundColor: '#D5BFB3',
    borderRadius: Radius.md || 10,
    borderWidth: 1,
    borderColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  registerButton: {
    width: '100%',
    height: 46,
    backgroundColor: '#D5BFB3',
    borderRadius: Radius.md || 10,
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
  resetContainer: {
    width: 393,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  resetText: {
    fontFamily: 'Montserrat',
    fontSize: 15,
    fontWeight: '400',
    color: '#000000',
    textAlign: 'center',
  },
});