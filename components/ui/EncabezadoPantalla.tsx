import { useRouter } from "expo-router";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { PRODUCT_DETAIL_ICONS } from "../../constants/assets";
import { Colors, FontSize, Spacing } from "../../constants/theme";

/** Encabezado con botón de volver y título, como el de Mis direcciones. */
export function EncabezadoPantalla({ titulo }: { titulo: string }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.header, { paddingTop: insets.top }]}>
      <View style={styles.headerInner}>
        <Pressable accessibilityLabel="Volver" onPress={() => router.back()} style={styles.backButton}>
          <Image source={PRODUCT_DETAIL_ICONS.back} style={styles.backIcon} />
        </Pressable>
        <Text numberOfLines={1} style={styles.title}>
          {titulo}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    width: "100%",
    paddingBottom: Spacing.xs,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
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
    flex: 1,
    color: Colors.primary,
    fontSize: FontSize.lg,
    letterSpacing: 0.6,
    fontFamily: "Montserrat_700Bold",
  },
});
