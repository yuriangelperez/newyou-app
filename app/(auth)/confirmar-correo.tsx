import * as Linking from "expo-linking";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Platform, Pressable, ScrollView, Text, View } from "react-native";

import { EncabezadoPantalla } from "../../components/ui/EncabezadoPantalla";
import { estilosFormulario as styles } from "../../constants/estilosFormulario";
import { ROUTES } from "../../constants/routes";
import { Colors } from "../../constants/theme";
import { abrirSesionDesdeEnlace } from "../../services/auth";

/**
 * Se abre desde el enlace del correo de confirmación (newyou://confirmar-correo#access_token=...).
 * Supabase ya marcó el correo como confirmado al tocar el enlace; acá se abre la sesión.
 */
export default function ConfirmarCorreoScreen() {
  const router = useRouter();
  const url = Linking.useURL();
  const [estado, setEstado] = useState<"verificando" | "listo" | "error">("verificando");
  const [mensajeError, setMensajeError] = useState("");

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

  return (
    <View style={styles.screen}>
      <EncabezadoPantalla titulo="CONFIRMAR CORREO" />
      <ScrollView contentContainerStyle={styles.content}>
        {estado === "verificando" ? <ActivityIndicator color={Colors.primary} /> : null}

        {estado === "listo" ? (
          <>
            <View style={styles.card} testID="correo-confirmado">
              <Text style={styles.cardTitle}>¡Correo confirmado!</Text>
              <Text style={styles.cardText}>Tu cuenta ya está activa. Bienvenido a New You.</Text>
            </View>
            <Pressable style={styles.saveButton} onPress={() => router.replace(ROUTES.home)}>
              <Text style={styles.saveText}>Empezar</Text>
            </Pressable>
          </>
        ) : null}

        {estado === "error" ? (
          <>
            <Text style={[styles.aviso, styles.danger]}>{mensajeError}</Text>
            <Text style={styles.muted}>
              Si ya habías tocado el enlace antes, tu correo está confirmado: iniciá sesión. Si no, entrá con tu correo y
              contraseña y te ofrecemos mandarte un enlace nuevo.
            </Text>
            <Pressable style={styles.saveButton} onPress={() => router.replace(ROUTES.login)}>
              <Text style={styles.saveText}>Ir a iniciar sesión</Text>
            </Pressable>
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}
