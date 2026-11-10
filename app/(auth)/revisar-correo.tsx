import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import Toast from "react-native-toast-message";

import { EncabezadoPantalla } from "../../components/ui/EncabezadoPantalla";
import { estilosFormulario as styles } from "../../constants/estilosFormulario";
import { ROUTES } from "../../constants/routes";
import { Colors } from "../../constants/theme";
import { reenviarConfirmacion } from "../../services/auth";

/** Supabase no deja pedir otro correo antes de un minuto. */
const ESPERA_SEGUNDOS = 60;

/**
 * Después de registrarse (o de intentar entrar sin confirmar): avisa que se mandó el
 * correo de confirmación y deja reenviarlo. La cuenta no se puede usar hasta tocar el enlace,
 * así se sabe que el correo existe y es de quien se registró.
 */
export default function RevisarCorreoScreen() {
  const router = useRouter();
  const { correo = "", reenviar } = useLocalSearchParams<{ correo?: string; reenviar?: string }>();
  // Recién registrado el correo ya salió: se espera antes de ofrecer otro.
  const [espera, setEspera] = useState(reenviar === "1" ? 0 : ESPERA_SEGUNDOS);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    if (espera <= 0) return;
    const reloj = setTimeout(() => setEspera((s) => s - 1), 1000);
    return () => clearTimeout(reloj);
  }, [espera]);

  const onReenviar = async () => {
    setEnviando(true);
    const { error } = await reenviarConfirmacion(correo);
    setEnviando(false);
    if (error) {
      Toast.show({ type: "error", text1: "No se pudo reenviar el correo", text2: error.message });
      return;
    }
    Toast.show({ type: "success", text1: "Te mandamos el correo de nuevo" });
    setEspera(ESPERA_SEGUNDOS);
  };

  return (
    <View style={styles.screen}>
      <EncabezadoPantalla titulo="CONFIRMÁ TU CORREO" />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.card} testID="revisar-correo">
          <Text style={styles.cardTitle}>Revisá tu correo</Text>
          <Text style={styles.cardText}>
            {`Te mandamos un enlace a ${correo || "tu correo"}. Tocalo desde el celular para confirmar la cuenta y después iniciá sesión.`}
          </Text>
          <Text style={styles.muted}>
            Si no lo ves en unos minutos, buscalo en Spam o Promociones. Si el enlace no abre la app, la cuenta igual queda
            confirmada: volvé y entrá con tu correo y contraseña.
          </Text>
        </View>

        {correo ? (
          <Pressable
            testID="revisar-correo-reenviar"
            disabled={enviando || espera > 0}
            onPress={() => void onReenviar()}
            style={[styles.saveButton, (enviando || espera > 0) && styles.disabled]}
          >
            {enviando ? (
              <ActivityIndicator color={Colors.white} />
            ) : (
              <Text style={styles.saveText}>{espera > 0 ? `Reenviar correo (${espera} s)` : "Reenviar correo"}</Text>
            )}
          </Pressable>
        ) : null}

        <Pressable onPress={() => router.replace(ROUTES.login)} style={{ alignItems: "center" }}>
          <Text style={styles.link}>Ir a iniciar sesión</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}
