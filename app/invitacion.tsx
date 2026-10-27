import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Pressable, Text, TextInput, View } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import Toast from "react-native-toast-message";

import { EncabezadoPantalla } from "../components/ui/EncabezadoPantalla";
import { ROUTES } from "../constants/routes";
import { estilosFormulario as styles } from "../constants/estilosFormulario";
import { Colors } from "../constants/theme";
import { aceptarInvitacion } from "../services/empresasService";
import { traducirError } from "../services/erroresSupabase";
import { useEmpresaStore } from "../stores/useEmpresaStore";
import { useUsuarioStore } from "../stores/useUsuarioStore";

/** Acepta una invitación: llega por el enlace newyou://invitacion?codigo=XXXX o con el código a mano. */
export default function InvitacionScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ codigo?: string }>();
  const email = useUsuarioStore((state) => state.usuario?.email);
  const [codigo, setCodigo] = useState(typeof params.codigo === "string" ? params.codigo.trim().toUpperCase() : "");
  const [aceptando, setAceptando] = useState(false);

  const onAceptar = async () => {
    if (!codigo.trim()) {
      Toast.show({ type: "error", text1: "Ingresá el código" });
      return;
    }

    try {
      setAceptando(true);
      const empresaId = await aceptarInvitacion(codigo);
      const store = useEmpresaStore.getState();
      await store.cargar();
      // El empleado queda actuando como la empresa (modo empresa predeterminado).
      await store.setEmpresaActiva(empresaId);
      Toast.show({ type: "success", text1: "Ya sos parte del equipo", text2: "Estás usando la app como la empresa." });
      router.replace(ROUTES.companyPanel);
    } catch (err) {
      Toast.show({
        type: "error",
        text1: "No se pudo aceptar",
        text2: traducirError(err),
      });
    } finally {
      setAceptando(false);
    }
  };

  return (
    <View style={styles.screen}>
      <EncabezadoPantalla titulo="INVITACIÓN" />
      <KeyboardAwareScrollView bottomOffset={24} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.aviso}>
          La invitación tiene que estar a nombre del correo de esta cuenta{email ? ` (${email})` : ""}.
        </Text>
        <View style={styles.card}>
          <Text style={styles.label}>Código de invitación</Text>
          <TextInput
            value={codigo}
            onChangeText={(texto) => setCodigo(texto.replace(/\s/g, "").toUpperCase())}
            autoCapitalize="characters"
            style={styles.input}
            placeholder="AB12CD34"
            placeholderTextColor={Colors.textMuted}
          />
          <Pressable
            disabled={aceptando}
            onPress={() => void onAceptar()}
            style={[styles.saveButton, aceptando && styles.disabled]}
          >
            {aceptando ? <ActivityIndicator color={Colors.white} /> : <Text style={styles.saveText}>Unirme</Text>}
          </Pressable>
        </View>
      </KeyboardAwareScrollView>
    </View>
  );
}
