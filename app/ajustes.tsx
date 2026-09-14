import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useMemo, useState } from "react";
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { BottomTabBar } from "../components/BottomTabBar";
import { PRODUCT_DETAIL_ICONS } from "../constants/assets";
import { ROUTES } from "../constants/routes";
import { Colors, Radius } from "../constants/theme";
import { selectTotalItems, useCarritoStore } from "../stores/useCarritoStore";
import { useUsuarioStore } from "../stores/useUsuarioStore";

const CANVAS_WIDTH = 412;

export default function AjustesScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const totalItems = useCarritoStore(selectTotalItems);
  const esVendedor = useUsuarioStore((state) => state.usuario?.role === "vendedor");
  const [notificacionesPush, setNotificacionesPush] = useState(true);
  const [notificacionesCorreo, setNotificacionesCorreo] = useState(false);
  const [promociones, setPromociones] = useState(true);

  const canvasWidth = Math.min(width, CANVAS_WIDTH);
  const scale = canvasWidth / CANVAS_WIDTH;
  const styles = useMemo(
    () => createStyles(scale, insets.top, insets.bottom),
    [insets.bottom, insets.top, scale],
  );

  return (
    <View style={styles.screen}>
      <StatusBar style="dark" />

      <View style={styles.header}>
        <Pressable
          accessibilityLabel="Volver"
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Image source={PRODUCT_DETAIL_ICONS.back} style={styles.backIcon} />
        </Pressable>
        <Text style={styles.headerTitle}>AJUSTES</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.sectionTitle}>NOTIFICACIONES</Text>
        <View style={styles.card}>
          <SettingSwitch
            title="Notificaciones push"
            detail="Recibí novedades sobre tus compras."
            value={notificacionesPush}
            onValueChange={setNotificacionesPush}
            styles={styles}
          />
          <View style={styles.divider} />
          <SettingSwitch
            title="Notificaciones por correo"
            detail="Recibí actualizaciones en tu email."
            value={notificacionesCorreo}
            onValueChange={setNotificacionesCorreo}
            styles={styles}
          />
          <View style={styles.divider} />
          <SettingSwitch
            title="Promociones y novedades"
            detail="Conocé ofertas y nuevos productos."
            value={promociones}
            onValueChange={setPromociones}
            styles={styles}
          />
        </View>

        <Text style={styles.sectionTitle}>AYUDA</Text>
        <View style={styles.card}>
          <SettingButton title="Soporte" detail="Contactá al equipo de New You." styles={styles} />
          <View style={styles.divider} />
          <SettingButton title="Preguntas frecuentes" detail="Encontrá respuestas sobre la aplicación." styles={styles} />
        </View>

        <Text style={styles.sectionTitle}>INFORMACIÓN</Text>
        <View style={styles.card}>
          <SettingButton title="Política de privacidad" detail="Conocé cómo cuidamos tus datos." styles={styles} />
          <View style={styles.divider} />
          <SettingButton title="Términos y condiciones" detail="Consultá las condiciones de uso." styles={styles} />
          <View style={styles.divider} />
          <SettingButton title="Versión de la aplicación" detail="New You · 1.0.0" styles={styles} />
        </View>
      </ScrollView>

      <BottomTabBar
        activeTab="menu"
        canvasWidth={Math.min(width, 560)}
        scale={scale}
        bottomInset={insets.bottom}
        cartCount={totalItems}
        esVendedor={esVendedor}
        onPressCreate={() => router.push(ROUTES.newProduct)}
        onPressHome={() => router.replace(ROUTES.home)}
        onPressBag={() => router.push(ROUTES.categories)}
        onPressCart={() => router.push(ROUTES.cart)}
        onPressMenu={() => router.push(ROUTES.profile)}
      />
    </View>
  );
}

type SettingStyles = ReturnType<typeof createStyles>;

function SettingSwitch({
  title,
  detail,
  value,
  onValueChange,
  styles,
}: {
  title: string;
  detail: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  styles: SettingStyles;
}) {
  return (
    <View style={styles.settingRow}>
      <View style={styles.settingCopy}>
        <Text style={styles.settingTitle}>{title}</Text>
        <Text style={styles.settingDetail}>{detail}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ true: Colors.secondary, false: "#CFCFCF" }}
        thumbColor={Colors.surface}
      />
    </View>
  );
}

function SettingButton({
  title,
  detail,
  styles,
}: {
  title: string;
  detail: string;
  styles: SettingStyles;
}) {
  return (
    <Pressable style={styles.settingRow} accessibilityRole="button">
      <View style={styles.settingCopy}>
        <Text style={styles.settingTitle}>{title}</Text>
        <Text style={styles.settingDetail}>{detail}</Text>
      </View>
      <Text style={styles.chevron}>›</Text>
    </Pressable>
  );
}

function createStyles(scale: number, topInset: number, bottomInset: number) {
  const s = (value: number) => value * scale;

  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: Colors.background },
    header: {
      height: topInset + s(76),
      paddingTop: topInset,
      paddingHorizontal: s(16),
      borderBottomWidth: s(2),
      borderBottomColor: Colors.secondary,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    backButton: { width: s(40), height: s(40), justifyContent: "center" },
    backIcon: { width: s(38), height: s(38), resizeMode: "contain" },
    headerSpacer: { width: s(40) },
    headerTitle: {
      flex: 1,
      color: Colors.primary,
      fontSize: s(22),
      fontWeight: "700",
      textAlign: "center",
    },
    content: {
      width: "100%",
      maxWidth: 720,
      alignSelf: "center",
      padding: s(20),
      paddingBottom: s(120) + bottomInset,
    },
    sectionTitle: {
      marginTop: s(8),
      marginBottom: s(10),
      color: Colors.primary,
      fontSize: s(14),
      fontWeight: "800",
    },
    card: {
      marginBottom: s(16),
      paddingHorizontal: s(14),
      borderWidth: 1,
      borderColor: Colors.border,
      borderRadius: Radius.md,
      backgroundColor: Colors.surface,
    },
    settingRow: {
      minHeight: s(64),
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: s(12),
    },
    settingCopy: { flex: 1 },
    settingTitle: { color: Colors.primary, fontSize: s(14), fontWeight: "700" },
    settingDetail: { marginTop: s(4), color: Colors.textMuted, fontSize: s(11), lineHeight: s(15) },
    divider: { height: 1, backgroundColor: Colors.border },
    chevron: { color: Colors.secondary, fontSize: s(28), lineHeight: s(28) },
  });
}