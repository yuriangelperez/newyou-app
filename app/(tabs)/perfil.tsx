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
import { Colors, Radius } from "../../constants/theme";
import { supabase } from "../../services/supabase";
import { selectTotalItems, useCarritoStore } from "../../stores/useCarritoStore";
import { selectEmpresaActiva, useEmpresaStore } from "../../stores/useEmpresaStore";
import { selectPuedeVender, useUsuarioStore } from "../../stores/useUsuarioStore";

export default function PerfilScreen() {
  const router = useRouter();
  const usuario = useUsuarioStore((state) => state.usuario);
  const totalItems = useCarritoStore(selectTotalItems);
  const setUsuario = useUsuarioStore((state) => state.setUsuario);
  const esVendedor = selectPuedeVender({ usuario });
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
    try {
      await supabase.auth.signOut();
    } catch {
      Toast.show({
        type: "error",
        text1: "No se pudo cerrar la sesión",
        text2: "Revisa tu conexión e intenta nuevamente.",
      });
      return;
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

  return (
    <View style={styles.screen}>
      <StatusBar style="dark" />
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>Perfil</Text>

        <View style={styles.card}>
          <Text style={styles.label}>Nombre</Text>
          <Text style={styles.value}>{usuario?.nombre ?? "Invitado"}</Text>

          <Text style={styles.label}>Email</Text>
          <Text style={styles.value}>
            {usuario?.email ?? "Sin sesion activa"}
          </Text>

          <Text style={styles.label}>Tipo de cuenta</Text>
          <Text style={styles.value}>
            {esVendedor ? "Vendedor particular" : "Comprador"}
          </Text>
        </View>
        <Pressable
          onPress={() => router.push(ROUTES.myPurchases)}
          style={styles.favoritesButton}
        >
          <Text style={styles.favoritesText}>Mis compras</Text>
        </Pressable>

        <Pressable
          onPress={() => router.push(ROUTES.addresses)}
          style={styles.favoritesButton}
        >
          <Text style={styles.favoritesText}>Direcciones</Text>
        </Pressable>

        {usuario ? (
          <View style={[styles.card, styles.companyCard]}>
            <Text style={styles.label}>Modo empresa</Text>
            {membresias.length > 0 ? (
              <>
                <Text style={styles.value}>Actuar como</Text>
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
                {empresaActiva ? (
                  <Pressable onPress={() => router.push(ROUTES.companyPanel)} style={styles.myProductsButton}>
                    <Text style={styles.myProductsText}>Panel de {empresaActiva.nombre}</Text>
                  </Pressable>
                ) : null}
              </>
            ) : (
              <Text style={styles.value}>Vendé como tienda, con sedes y equipo.</Text>
            )}
            <Pressable onPress={() => router.push(ROUTES.newCompany)} style={styles.favoritesButton}>
              <Text style={styles.favoritesText}>Crear empresa</Text>
            </Pressable>
            <Pressable onPress={() => router.push(ROUTES.invitation)} style={styles.favoritesButton}>
              <Text style={styles.favoritesText}>Tengo un código de invitación</Text>
            </Pressable>
          </View>
        ) : null}

        {esVendedor ? (
          <>
            <Pressable
              onPress={() => router.push(ROUTES.myProducts)}
              style={styles.myProductsButton}
            >
              <Text style={styles.myProductsText}>Mis publicaciones</Text>
            </Pressable>
            <Pressable
              onPress={() => router.push(ROUTES.mySales)}
              style={styles.myProductsButton}
            >
              <Text style={styles.myProductsText}>Mis ventas</Text>
            </Pressable>

          </>
        ) : usuario ? (
          <Pressable
            onPress={() => void convertirseEnVendedor()}
            style={styles.myProductsButton}
          >
            <Text style={styles.myProductsText}>Quiero vender prendas</Text>
          </Pressable>
        ) : null}

        <Pressable
          onPress={() => router.push(ROUTES.favorites)}
          style={styles.favoritesButton}
        >
          <Text style={styles.favoritesText}>Favoritos</Text>
        </Pressable>

        <Pressable
          onPress={() => void cerrarSesion()}
          style={styles.logoutButton}
        >
          <Text style={styles.logoutText}>Cerrar Sesion</Text>
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
      marginBottom: s(20),
      fontFamily: "Montserrat_700Bold",
    },
    card: {
      backgroundColor: Colors.surface,
      borderWidth: 1,
      borderColor: Colors.secondary,
      borderRadius: Radius.md,
      padding: s(16),
      rowGap: s(6),
    },
    label: {
      color: Colors.textMuted,
      fontSize: s(12),
      fontFamily: "Montserrat_500Medium",
    },
    value: {
      color: Colors.text,
      fontSize: s(16),
      marginBottom: s(8),
      fontFamily: "Montserrat_600SemiBold",
    },
    chevron: {
      position: "absolute",
      right: s(16),
      color: Colors.secondary,
      fontSize: s(20),
      fontFamily: "Montserrat_700Bold",
    },
    logoutButton: {
      marginTop: s(20),
      minHeight: s(46),
      borderRadius: Radius.md,
      backgroundColor: "#E9B4B4",
      alignItems: "center",
      justifyContent: "center",
    },
    myProductsButton: {
      marginTop: s(16),
      minHeight: s(46),
      borderRadius: Radius.md,
      backgroundColor: Colors.secondary,
      alignItems: "center",
      justifyContent: "center",
    },

    myProductsText: {
      color: Colors.white,
      fontSize: s(15),
      fontFamily: "Montserrat_700Bold",
    },

    favoritesButton: {
      marginTop: s(16),
      minHeight: s(46),
      borderRadius: Radius.md,
      borderWidth: 1,
      borderColor: Colors.secondary,
      backgroundColor: Colors.surface,
      alignItems: "center",
      justifyContent: "center",
    },
    favoritesText: {
      color: "#2D1F16",
      fontSize: s(15),
      fontFamily: "Montserrat_700Bold",
    },
    companyCard: {
      marginTop: s(16),
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
    logoutText: {
      color: "#2D1F16",
      fontSize: s(15),
      fontFamily: "Montserrat_700Bold",
    },
  });
}
