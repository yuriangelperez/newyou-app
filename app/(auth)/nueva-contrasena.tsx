import * as Linking from "expo-linking";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Platform, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import Toast from "react-native-toast-message";

import { EncabezadoPantalla } from "../../components/ui/EncabezadoPantalla";
import { estilosFormulario as styles } from "../../constants/estilosFormulario";
import { ROUTES } from "../../constants/routes";
import { Colors } from "../../constants/theme";
import { abrirSesionDesdeEnlace, actualizarContrasena } from "../../services/auth";

/** Se abre desde el enlace del correo de recuperación (newyou://nueva-contrasena#access_token=...). */
export default function NuevaContrasenaScreen() {
  const router = useRouter();
  const url = Linking.useURL();
  const [estado, setEstado] = useState<"verificando" | "listo" | "error">("verificando");
  const [mensajeError, setMensajeError] = useState("");
  const [contrasena, setContrasena] = useState("");
  const [repetir, setRepetir] = useState("");
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    // En la web el fragmento (#access_token=...) sólo está en window.location.
    const enlace = Platform.OS === "web" && typeof window !== "undefined" ? window.location.href : url;
    if (!enlace) return;

    abrirSesionDesdeEnlace(enlace).then(({ error }) => {
      if (error) {
        setMensajeError(error.message);
        setEstado("error");
      } else {
        setEstado("listo");
      }
    });
  }, [url]);

  const onGuardar = async () => {
    if (contrasena.length < 6) {
      Toast.show({ type: "error", text1: "La contraseña debe tener al menos 6 caracteres" });
      return;
    }
    if (contrasena !== repetir) {
      Toast.show({ type: "error", text1: "Las contraseñas no coinciden" });
      return;
    }

    setGuardando(true);
    const { error } = await actualizarContrasena(contrasena);
    setGuardando(false);

    if (error) {
      Toast.show({ type: "error", text1: "No se pudo cambiar la contraseña", text2: error.message });
      return;
    }

    Toast.show({ type: "success", text1: "Contraseña actualizada" });
    router.replace(ROUTES.home);
  };

  return (
    <View style={styles.screen}>
      <EncabezadoPantalla titulo="NUEVA CONTRASEÑA" />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {estado === "verificando" ? <ActivityIndicator color={Colors.primary} /> : null}

        {estado === "error" ? (
          <>
            <Text style={[styles.aviso, styles.danger]}>{mensajeError}</Text>
            <Pressable style={styles.saveButton} onPress={() => router.replace(ROUTES.forgotPassword)}>
              <Text style={styles.saveText}>Pedir un enlace nuevo</Text>
            </Pressable>
          </>
        ) : null}

        {estado === "listo" ? (
          <View style={styles.card}>
            <Text style={styles.label}>Contraseña nueva</Text>
            <TextInput
              value={contrasena}
              onChangeText={setContrasena}
              secureTextEntry
              autoCapitalize="none"
              style={styles.input}
              placeholderTextColor={Colors.textMuted}
            />
            <Text style={styles.label}>Repetila</Text>
            <TextInput
              value={repetir}
              onChangeText={setRepetir}
              secureTextEntry
              autoCapitalize="none"
              style={styles.input}
              placeholderTextColor={Colors.textMuted}
            />
            <Pressable
              disabled={guardando}
              onPress={() => void onGuardar()}
              style={[styles.saveButton, guardando && styles.disabled]}
            >
              {guardando ? <ActivityIndicator color={Colors.white} /> : <Text style={styles.saveText}>Guardar contraseña</Text>}
            </Pressable>
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}
