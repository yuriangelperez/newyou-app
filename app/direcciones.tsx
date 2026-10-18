import { useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";

import { BotonGps } from "../components/ui/BotonGps";
import { VerEnMapa } from "../components/ui/VerEnMapa";
import { PRODUCT_DETAIL_ICONS } from "../constants/assets";
import { Colors, FontSize, Radius, Spacing } from "../constants/theme";
import { useDirecciones } from "../hooks/useDirecciones";
import {
  crearDireccion,
  eliminarDireccion,
  marcarPrincipal,
} from "../services/direccionesService";

export default function DireccionesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { direcciones, cargando, error, recargar } = useDirecciones();
  const [alias, setAlias] = useState("");
  const [direccion, setDireccion] = useState("");
  const [guardando, setGuardando] = useState(false);

  const avisarError = (titulo: string, err: unknown) =>
    Toast.show({
      type: "error",
      text1: titulo,
      text2: err instanceof Error ? err.message : "Intenta nuevamente.",
    });

  const onGuardar = async () => {
    if (!direccion.trim()) {
      Toast.show({ type: "error", text1: "Ingresa una dirección" });
      return;
    }

    try {
      setGuardando(true);
      await crearDireccion(direccion, alias);
      setAlias("");
      setDireccion("");
      await recargar();
      Toast.show({ type: "success", text1: "Dirección guardada" });
    } catch (err) {
      avisarError("No se pudo guardar", err);
    } finally {
      setGuardando(false);
    }
  };

  const onPrincipal = async (id: number) => {
    try {
      await marcarPrincipal(id);
      await recargar();
    } catch (err) {
      avisarError("No se pudo cambiar la principal", err);
    }
  };

  const onEliminar = (id: number, texto: string) => {
    Alert.alert("Eliminar dirección", `¿Eliminar "${texto}"?`, [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Eliminar",
        style: "destructive",
        onPress: async () => {
          try {
            await eliminarDireccion(id);
            await recargar();
          } catch (err) {
            avisarError("No se pudo eliminar", err);
          }
        },
      },
    ]);
  };

  return (
    <View style={styles.screen}>
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <View style={styles.headerInner}>
          <Pressable
            accessibilityLabel="Volver"
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <Image source={PRODUCT_DETAIL_ICONS.back} style={styles.backIcon} />
          </Pressable>
          <Text style={styles.title}>MIS DIRECCIONES</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + Spacing.xl }]}
        keyboardShouldPersistTaps="handled"
      >
        {cargando ? <ActivityIndicator color={Colors.primary} /> : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}

        {!cargando && !error && direcciones.length === 0 ? (
          <Text style={styles.empty}>
            Todavía no guardaste direcciones. La primera que agregues será la principal.
          </Text>
        ) : null}

        {direcciones.map((item) => (
          <View key={item.id} style={styles.card}>
            <View style={styles.cardRow}>
              <Text style={styles.cardTitle}>{item.alias || "Dirección"}</Text>
              {item.esPrincipal ? <Text style={styles.badge}>Principal</Text> : null}
            </View>
            <Text style={styles.cardText}>{item.direccion}</Text>
            <VerEnMapa direccion={item.direccion} />
            <View style={styles.actions}>
              {!item.esPrincipal ? (
                <Pressable onPress={() => void onPrincipal(item.id)}>
                  <Text style={styles.link}>Hacer principal</Text>
                </Pressable>
              ) : (
                <View />
              )}
              <Pressable onPress={() => onEliminar(item.id, item.direccion)}>
                <Text style={[styles.link, styles.danger]}>Eliminar</Text>
              </Pressable>
            </View>
          </View>
        ))}

        <Text style={styles.sectionTitle}>Agregar dirección</Text>
        <View style={styles.card}>
          <TextInput
            value={alias}
            onChangeText={setAlias}
            placeholder="Nombre (opcional): Casa, Local..."
            placeholderTextColor={Colors.textMuted}
            style={styles.input}
          />
          <TextInput
            value={direccion}
            onChangeText={setDireccion}
            placeholder="Calle, número, ciudad"
            placeholderTextColor={Colors.textMuted}
            style={styles.input}
          />
          <BotonGps onDireccion={setDireccion} />
          <VerEnMapa direccion={direccion} />
          <Pressable
            disabled={guardando}
            onPress={() => void onGuardar()}
            style={[styles.saveButton, guardando && styles.disabled]}
          >
            {guardando ? (
              <ActivityIndicator color={Colors.white} />
            ) : (
              <Text style={styles.saveText}>Guardar dirección</Text>
            )}
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  header: {
    width: "100%",
    paddingBottom: Spacing.sm,
    borderBottomWidth: 2,
    borderBottomColor: Colors.secondary,
    alignItems: "center",
  },
  headerInner: {
    width: "100%",
    maxWidth: 800,
    minHeight: 60,
    paddingHorizontal: Spacing.md,
    flexDirection: "row",
    alignItems: "center",
    columnGap: Spacing.md,
  },
  backButton: { width: 39, height: 39, alignItems: "center", justifyContent: "center" },
  backIcon: { width: 39, height: 39, resizeMode: "contain" },
  title: {
    color: Colors.primary,
    fontSize: FontSize.xl,
    fontFamily: "Montserrat_500Medium",
  },
  content: {
    width: "100%",
    maxWidth: 800,
    alignSelf: "center",
    padding: Spacing.md,
    rowGap: Spacing.md,
  },
  empty: {
    color: Colors.textMuted,
    fontSize: FontSize.md,
    fontFamily: "Montserrat_500Medium",
  },
  error: { color: Colors.danger, fontFamily: "Montserrat_500Medium" },
  card: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.secondary,
    borderRadius: Radius.md,
    padding: Spacing.md,
    rowGap: Spacing.sm,
  },
  cardRow: { flexDirection: "row", justifyContent: "space-between" },
  cardTitle: {
    color: Colors.primary,
    fontSize: FontSize.lg,
    fontFamily: "Montserrat_700Bold",
  },
  badge: {
    color: Colors.secondary,
    fontSize: FontSize.sm,
    fontFamily: "Montserrat_700Bold",
  },
  cardText: {
    color: Colors.text,
    fontSize: FontSize.md,
    fontFamily: "Montserrat_500Medium",
  },
  actions: { flexDirection: "row", justifyContent: "space-between" },
  link: {
    color: Colors.secondary,
    fontSize: FontSize.md,
    fontFamily: "Montserrat_700Bold",
  },
  danger: { color: Colors.danger },
  sectionTitle: {
    color: Colors.primary,
    fontSize: FontSize.lg,
    fontFamily: "Montserrat_700Bold",
  },
  input: {
    minHeight: 44,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.secondary,
    backgroundColor: Colors.surface,
    color: Colors.text,
    fontSize: FontSize.md,
    fontFamily: "Montserrat_400Regular",
  },
  saveButton: {
    minHeight: 46,
    borderRadius: Radius.md,
    backgroundColor: Colors.secondary,
    alignItems: "center",
    justifyContent: "center",
  },
  disabled: { opacity: 0.55 },
  saveText: {
    color: Colors.white,
    fontSize: FontSize.lg,
    fontFamily: "Montserrat_700Bold",
  },
});
