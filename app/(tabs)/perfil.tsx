import { Ionicons } from "@expo/vector-icons";
import { useMemo } from "react";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import Toast from "react-native-toast-message";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { BottomTabBar } from "../../components/BottomTabBar";
import { ROUTES } from "../../constants/routes";
import { Colors, Radius, Shadow } from "../../constants/theme";
import { supabase } from "../../services/supabase";
import { desregistrarDispositivoPush } from "../../services/pushService";
import { selectTotalItems, useCarritoStore } from "../../stores/useCarritoStore";
import { puede, selectEmpresaActiva, useEmpresaStore } from "../../stores/useEmpresaStore";
import { useUsuarioStore } from "../../stores/useUsuarioStore";
import { usePuedeVender } from "../../hooks/usePuedeVender";

export default function PerfilScreen() {
  const router = useRouter();
  const usuario = useUsuarioStore((state) => state.usuario);
  const totalItems = useCarritoStore(selectTotalItems);
  const setUsuario = useUsuarioStore((state) => state.setUsuario);
  const esVendedor = usePuedeVender();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const canvasWidth = Math.min(width, 412);
  const scale = canvasWidth / 412;
  const styles = useMemo(
    () => createStyles(scale, insets.bottom, insets.top),
    [insets.bottom, insets.top, scale],
  );

  const clearUsuario = useUsuarioStore((state) => state.clearUsuario);
  const membresias = useEmpresaStore((state) => state.membresias);
  const empresaActiva = useEmpresaStore(selectEmpresaActiva);
  const setEmpresaActiva = useEmpresaStore((state) => state.setEmpresaActiva);

  const cerrarSesion = async () => {
    // Antes de salir: este celular deja de recibir los push de esta cuenta.
    await desregistrarDispositivoPush().catch(() => undefined);

    const { error } = await supabase.auth.signOut();
    if (error) {
      // Si el servidor no responde, se cierra igual en este dispositivo (Clase 8):
      // borra la sesión de SecureStore para no dejar al usuario atrapado.
      await supabase.auth.signOut({ scope: "local" }).catch(() => undefined);
      Toast.show({
        type: "info",
        text1: "Sesión cerrada en este dispositivo",
        text2: "No pudimos avisar al servidor; revisá tu conexión.",
      });
    }

    clearUsuario();
    useEmpresaStore.getState().limpiar();
    router.replace(ROUTES.login);
  };

  const convertirseEnVendedor = async () => {
    if (!usuario) {
      return;
    }

    try {
      // El tipo de cuenta sólo se cambia en el servidor (migración 05).
      const { error } = await supabase.rpc("activar_modo_particular");

      if (error) {
        throw error;
      }

      setUsuario({ ...usuario, role: "particular" });
      Toast.show({ type: "success", text1: "Ya podés vender tus prendas" });
    } catch {
      Toast.show({
        type: "error",
        text1: "No se pudo cambiar el tipo de cuenta",
        text2: "Intenta nuevamente en unos minutos.",
      });
    }
  };

  const inicial = (usuario?.nombre ?? "?").trim().charAt(0).toUpperCase() || "?";
  const tipoCuenta = usuario?.role === "particular" ? "Vendedor particular" : "Comprador";

  // Fila de menú: ícono, texto y flecha. `destacada` para la acción principal de una sección.
  const fila = (
    icono: keyof typeof Ionicons.glyphMap,
    texto: string,
    onPress: () => void,
    opciones: { destacada?: boolean; detalle?: string } = {},
  ) => (
    <Pressable
      key={texto}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
    >
      <View style={[styles.rowIcon, opciones.destacada && styles.rowIconAccent]}>
        <Ionicons name={icono} size={18} color={opciones.destacada ? Colors.white : Colors.primary} />
      </View>
      <View style={styles.rowTexts}>
        <Text style={styles.rowText}>{texto}</Text>
        {opciones.detalle ? <Text style={styles.rowDetail}>{opciones.detalle}</Text> : null}
      </View>
      <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
    </Pressable>
  );

  const ventas = esVendedor
    ? [
        fila("pricetags-outline", "Mis publicaciones", () => router.push(ROUTES.myProducts)),
        fila("receipt-outline", empresaActiva ? `Ventas de ${empresaActiva.nombre}` : "Mis ventas", () =>
          router.push(ROUTES.mySales),
        ),
        ...(!empresaActiva || puede(empresaActiva, "metricas.ver")
          ? [fila("stats-chart-outline", "Métricas", () => router.push(ROUTES.metrics))]
          : []),
      ]
    : puede(empresaActiva, "pedidos.ver")
      ? // Por ejemplo, el rol Envíos: no publica, pero gestiona los pedidos de la empresa.
        [fila("receipt-outline", `Ventas de ${empresaActiva?.nombre}`, () => router.push(ROUTES.mySales))]
      : usuario?.role === "comprador"
        ? [
            fila("storefront-outline", "Quiero vender prendas", () => void convertirseEnVendedor(), {
              destacada: true,
              detalle: "Publicá tus prendas como particular",
            }),
          ]
        : [];

  return (
    <View style={styles.screen}>
      <StatusBar style="dark" />
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>Perfil</Text>

        <View style={[styles.card, styles.profileCard]}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{inicial}</Text>
          </View>
          <View style={styles.profileTexts}>
            <Text numberOfLines={1} style={styles.profileName}>
              {usuario?.nombre ?? "Invitado"}
            </Text>
            <Text numberOfLines={1} style={styles.profileEmail}>
              {usuario?.email ?? "Sin sesión activa"}
            </Text>
            <View style={styles.badgeRow}>
              <Text style={styles.badge}>{tipoCuenta}</Text>
              {empresaActiva ? <Text style={[styles.badge, styles.badgeAccent]}>{empresaActiva.nombre}</Text> : null}
              {usuario?.esAdmin ? <Text style={styles.badge}>Administrador</Text> : null}
            </View>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Mi cuenta</Text>
        <View style={styles.card}>
          {fila("bag-handle-outline", "Mis compras", () => router.push(ROUTES.myPurchases))}
          {fila("heart-outline", "Favoritos", () => router.push(ROUTES.favorites))}
          {fila("location-outline", "Direcciones", () => router.push(ROUTES.addresses))}
          {fila("settings-outline", "Ajustes", () => router.push(ROUTES.settings))}
        </View>

        {ventas.length > 0 ? (
          <>
            <Text style={styles.sectionTitle}>Ventas</Text>
            <View style={styles.card}>{ventas}</View>
          </>
        ) : null}

        {usuario ? (
          <>
            <Text style={styles.sectionTitle}>Modo empresa</Text>
            <View style={styles.card}>
              {membresias.length > 0 ? (
                <View style={styles.contextBox}>
                  <Text style={styles.label}>Actuar como</Text>
                  <View style={styles.chips}>
                    {[{ id: null, nombre: "Yo" }, ...membresias.map((m) => ({ id: m.empresaId, nombre: m.nombre }))].map(
                      (opcion) => {
                        const activa = (empresaActiva?.empresaId ?? null) === opcion.id;
                        return (
                          <Pressable
                            key={opcion.id ?? "yo"}
                            onPress={() => void setEmpresaActiva(opcion.id)}
                            style={[styles.chip, activa && styles.chipActive]}
                          >
                            <Text style={[styles.chipText, activa && styles.chipTextActive]}>{opcion.nombre}</Text>
                          </Pressable>
                        );
                      },
                    )}
                  </View>
                </View>
              ) : (
                <Text style={styles.helper}>Vendé como tienda, con sedes y equipo.</Text>
              )}
              {empresaActiva
                ? fila("business-outline", `Panel de ${empresaActiva.nombre}`, () => router.push(ROUTES.companyPanel), {
                    destacada: true,
                  })
                : null}
              {fila("add-circle-outline", "Crear empresa", () => router.push(ROUTES.newCompany))}
              {fila("key-outline", "Tengo un código de invitación", () => router.push(ROUTES.invitation))}
            </View>
          </>
        ) : null}

        {usuario?.esAdmin ? (
          <>
            <Text style={styles.sectionTitle}>Administración</Text>
            <View style={styles.card}>
              {fila("shield-checkmark-outline", "Panel de administrador", () => router.push(ROUTES.admin), {
                detalle: "Verificar y suspender empresas",
              })}
            </View>
          </>
        ) : null}

        <Pressable
          onPress={() => void cerrarSesion()}
          style={({ pressed }) => [styles.logoutButton, pressed && styles.rowPressed]}
        >
          <Ionicons name="log-out-outline" size={18} color={Colors.danger} />
          <Text style={styles.logoutText}>Cerrar sesión</Text>
        </Pressable>
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

function createStyles(scale: number, bottomInset: number, topInset: number) {
  const s = (value: number) => value * scale;

  return StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: Colors.background,
    },
    content: {
      flexGrow: 1,
      width: "100%",
      maxWidth: 800,
      alignSelf: "center",
      paddingHorizontal: s(16),
      paddingTop: topInset + s(24),
      paddingBottom: s(26) + s(78) + bottomInset,
    },
    title: {
      fontSize: s(28),
      color: Colors.primary,
      marginBottom: s(16),
      fontFamily: "Montserrat_700Bold",
    },
    card: {
      backgroundColor: Colors.surface,
      borderWidth: 1,
      borderColor: Colors.border,
      borderRadius: Radius.lg,
      overflow: "hidden",
      ...Shadow.card,
    },
    profileCard: {
      flexDirection: "row",
      alignItems: "center",
      columnGap: s(14),
      padding: s(16),
    },
    avatar: {
      width: s(56),
      height: s(56),
      borderRadius: Radius.full,
      backgroundColor: Colors.secondary,
      alignItems: "center",
      justifyContent: "center",
    },
    avatarText: {
      color: Colors.white,
      fontSize: s(24),
      fontFamily: "Montserrat_700Bold",
    },
    profileTexts: { flex: 1, rowGap: s(2) },
    profileName: {
      color: Colors.primary,
      fontSize: s(18),
      fontFamily: "Montserrat_700Bold",
    },
    profileEmail: {
      color: Colors.textMuted,
      fontSize: s(13),
      fontFamily: "Montserrat_500Medium",
    },
    badgeRow: { flexDirection: "row", flexWrap: "wrap", gap: s(6), marginTop: s(6) },
    badge: {
      paddingHorizontal: s(8),
      paddingVertical: s(2),
      borderRadius: Radius.full,
      backgroundColor: Colors.background,
      color: Colors.primary,
      fontSize: s(11),
      overflow: "hidden",
      fontFamily: "Montserrat_600SemiBold",
    },
    badgeAccent: { backgroundColor: Colors.tertiary },
    sectionTitle: {
      marginTop: s(22),
      marginBottom: s(8),
      marginLeft: s(4),
      color: Colors.textMuted,
      fontSize: s(12),
      letterSpacing: 0.8,
      textTransform: "uppercase",
      fontFamily: "Montserrat_700Bold",
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      columnGap: s(12),
      minHeight: s(56),
      paddingHorizontal: s(14),
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: Colors.border,
    },
    rowPressed: { backgroundColor: Colors.background },
    rowIcon: {
      width: s(34),
      height: s(34),
      borderRadius: Radius.md,
      backgroundColor: Colors.background,
      alignItems: "center",
      justifyContent: "center",
    },
    rowIconAccent: { backgroundColor: Colors.secondary },
    rowTexts: { flex: 1, paddingVertical: s(10) },
    rowText: {
      color: Colors.text,
      fontSize: s(15),
      fontFamily: "Montserrat_600SemiBold",
    },
    rowDetail: {
      color: Colors.textMuted,
      fontSize: s(12),
      fontFamily: "Montserrat_500Medium",
    },
    contextBox: {
      padding: s(14),
      rowGap: s(8),
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: Colors.border,
    },
    label: {
      color: Colors.textMuted,
      fontSize: s(12),
      fontFamily: "Montserrat_600SemiBold",
    },
    helper: {
      padding: s(14),
      color: Colors.textMuted,
      fontSize: s(13),
      fontFamily: "Montserrat_500Medium",
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: Colors.border,
    },
    chips: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: s(8),
    },
    chip: {
      paddingHorizontal: s(14),
      paddingVertical: s(6),
      borderRadius: Radius.full,
      borderWidth: 1,
      borderColor: Colors.secondary,
    },
    chipActive: {
      backgroundColor: Colors.secondary,
    },
    chipText: {
      color: Colors.secondary,
      fontSize: s(13),
      fontFamily: "Montserrat_600SemiBold",
    },
    chipTextActive: {
      color: Colors.white,
    },
    logoutButton: {
      marginTop: s(24),
      minHeight: s(48),
      flexDirection: "row",
      columnGap: s(8),
      borderRadius: Radius.lg,
      borderWidth: 1,
      borderColor: Colors.border,
      backgroundColor: Colors.surface,
      alignItems: "center",
      justifyContent: "center",
    },
    logoutText: {
      color: Colors.danger,
      fontSize: s(15),
      fontFamily: "Montserrat_700Bold",
    },
  });
}
