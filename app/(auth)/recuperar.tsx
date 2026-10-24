import { useRouter } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Pressable, Text, TextInput, View } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";

import { EncabezadoPantalla } from "../../components/ui/EncabezadoPantalla";
import { estilosFormulario as styles } from "../../constants/estilosFormulario";
import { ROUTES } from "../../constants/routes";
import { Colors } from "../../constants/theme";
import { enviarRecuperacion } from "../../services/auth";

/** Pide el correo y envía el enlace para elegir una contraseña nueva. */
export default function RecuperarScreen() {
  const router = useRouter();
  const [correo, setCorreo] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [error, setError] = useState("");

  const onEnviar = async () => {
    if (!/^\S+@\S+\.\S+$/.test(correo.trim())) {
      setError("Ingresá un correo válido");
      return;
    }

    setError("");
    setEnviando(true);
    const { error: authError } = await enviarRecuperacion(correo);
    setEnviando(false);

    if (authError) {
      setError(authError.message);
      return;
    }

    setEnviado(true);
  };

  return (
    <View style={styles.screen}>
      <EncabezadoPantalla titulo="RECUPERAR CUENTA" />
      <KeyboardAwareScrollView bottomOffset={24} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {enviado ? (
          <>
            <Text style={styles.aviso}>
              Si {correo.trim()} tiene una cuenta, te llega un correo con un enlace para elegir una contraseña
              nueva. Abrilo desde este mismo dispositivo. Revisá también la carpeta de spam.
            </Text>
            <Pressable style={styles.saveButton} onPress={() => router.replace(ROUTES.login)}>
              <Text style={styles.saveText}>Volver al login</Text>
            </Pressable>
          </>
        ) : (
          <View style={styles.card}>
            <Text style={styles.cardText}>Ingresá el correo de tu cuenta y te enviamos un enlace para restablecer la contraseña.</Text>
            <TextInput
              value={correo}
              onChangeText={(valor) => {
                setCorreo(valor);
                setError("");
              }}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              placeholder="nombre@correo.com"
              placeholderTextColor={Colors.textMuted}
              style={styles.input}
            />
            {error ? <Text style={styles.error}>{error}</Text> : null}
            <Pressable
              disabled={enviando}
              onPress={() => void onEnviar()}
              style={[styles.saveButton, enviando && styles.disabled]}
            >
              {enviando ? <ActivityIndicator color={Colors.white} /> : <Text style={styles.saveText}>Enviar enlace</Text>}
            </Pressable>
          </View>
        )}
      </KeyboardAwareScrollView>
    </View>
  );
}
