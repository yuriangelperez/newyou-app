import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { useForm } from "react-hook-form";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";

import { SelectorDireccion } from "../../components/ui/SelectorDireccion";
import { InputField } from "../../components/ui/InputField";
import { CategoriaProductoSelector } from "../../components/ui/CategoriaProductoSelector";
import { ColoresSelector } from "../../components/ui/ColoresSelector";
import { CATEGORIA_PRODUCTO_POR_DEFECTO } from "../../constants/categoriasProductos";
import { ROUTES } from "../../constants/routes";
import { Colors, Radius, Spacing } from "../../constants/theme";
import {
  ProductoFormOutput,
  ProductoFormValues,
  productoSchema,
} from "../../schemas/productoSchema";
import { createProducto, ProductoInput } from "../../services/productosService";
import { useDirecciones } from "../../hooks/useDirecciones";
import { useNotifications } from "../../hooks/useNotifications";
import { guardarSiEsNueva } from "../../services/direccionesService";
import { encolarBorrador, hayConexion } from "../../services/offlineService";
import { SelectorImagenes } from "../../components/ui/SelectorImagenes";
import { StockPorSede } from "../../components/ui/StockPorSede";
import { usePuedeVender } from "../../hooks/usePuedeVender";
import { useSedesEmpresa } from "../../hooks/useSedesEmpresa";
import { selectEmpresaActiva, useEmpresaStore } from "../../stores/useEmpresaStore";

const DEFAULT_VALUES: ProductoFormValues = {
  nombre: "",
  precio: "0",
  descuentoActivo: false,
  descuentoPorcentaje: "0",
  stock: "1",
  imagen: "",
  imagenes: [],
  categoria: "Camisas",
  ...CATEGORIA_PRODUCTO_POR_DEFECTO,
  disponible: true,
  talle: "",
  colores: "",
  direccion: "",
  descripcion: "",
};

export default function NuevoProductoScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const esVendedor = usePuedeVender();
  const { recordarPublicacion } = useNotifications();
  const empresaActiva = useEmpresaStore(selectEmpresaActiva);
  const { editables: sedesEditables } = useSedesEmpresa(empresaActiva);
  const [stockSedes, setStockSedes] = useState<Record<number, string>>({});
  const [uploadingImage, setUploadingImage] = useState(false);

  const {
    control,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ProductoFormValues, undefined, ProductoFormOutput>({
    resolver: zodResolver(productoSchema),
    mode: "onChange",
    defaultValues: DEFAULT_VALUES,
  });

  const { direcciones } = useDirecciones();
  const direccionElegida = watch("direccion") ?? "";
  const setDireccion = useCallback(
    (valor: string) => setValue("direccion", valor, { shouldDirty: true }),
    [setValue],
  );

  const disponible = watch("disponible");
  const descuentoActivo = watch("descuentoActivo");
  const imagenes = watch("imagenes") ?? [];
  const setImagenes = (lista: string[]) => {
    setValue("imagenes", lista, { shouldValidate: true, shouldDirty: true });
    setValue("imagen", lista[0] ?? "", { shouldValidate: true });
  };

  if (!esVendedor) {
    return (
      <View style={styles.accessDenied}>
        <Text style={styles.title}>Publicar prendas</Text>
        <Text style={styles.accessDeniedText}>
          Esta opción está disponible sólo para cuentas de vendedor.
        </Text>
        <Pressable
          onPress={() => router.replace(ROUTES.home)}
          style={styles.backHomeButton}
        >
          <Text style={styles.backHomeText}>Volver al inicio</Text>
        </Pressable>
      </View>
    );
  }

  const onSubmit = handleSubmit(async (values) => {
    try {
      const talles = values.talle
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);

      const payload: ProductoInput = {
        nombre: values.nombre.trim(),
        precio: values.precio,
        descuentoPorcentaje: values.descuentoActivo ? values.descuentoPorcentaje : 0,
        stock: values.stock,
        imagen: values.imagenes[0] ?? "",
        imagenes: values.imagenes,
        categoria: values.categoria,
        tipoPrenda: values.tipoPrenda,
        temporada: values.temporada,
        publico: values.publico,
        disponible: values.disponible,
        talle: talles,
        colores: values.colores
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean),
        descripcion: values.descripcion.trim(),
        direccionRetiro: values.direccion?.trim() || undefined,
      };

      if (empresaActiva) {
        if (empresaActiva.estado !== "verificada") {
          Toast.show({
            type: "error",
            text1: "Tu empresa todavía no está verificada",
            text2: "Vas a poder publicar cuando se verifique el CUIT.",
          });
          return;
        }
        if (sedesEditables.length === 0) {
          Toast.show({ type: "error", text1: "No tenés sedes asignadas para publicar" });
          return;
        }
        if (!(await hayConexion())) {
          Toast.show({ type: "error", text1: "Necesitás conexión para publicar como empresa" });
          return;
        }

        const stockPorSede = sedesEditables.map((sede) => ({
          sedeId: sede.id,
          cantidad: Number(stockSedes[sede.id]) || 0,
        }));
        // La sede principal (dirección de retiro) es la primera con stock.
        const principal = stockPorSede.find((item) => item.cantidad > 0) ?? stockPorSede[0];
        payload.stock = stockPorSede.reduce((total, item) => total + item.cantidad, 0);
        payload.direccionRetiro = undefined;
        payload.empresa = { empresaId: empresaActiva.empresaId, sedeId: principal.sedeId, stockPorSede };
      }

      if (!(await hayConexion())) {
        await encolarBorrador({ tipo: "producto", payload });
        Toast.show({
          type: "offline",
          text1: "Sin conexión. Guardado en borradores locales.",
          text2: "La publicación se subirá al recuperar la red.",
        });
        router.replace(ROUTES.home);
        return;
      }

      const nuevoProducto = await createProducto(payload);

      // Si escribió una dirección nueva, queda guardada en sus direcciones.
      if (!payload.empresa) {
        guardarSiEsNueva(payload.direccionRetiro ?? "", direcciones).catch(() => {});
      }

      // Recordatorio local al día siguiente (se cancela si la prenda se borra).
      void recordarPublicacion({ id: nuevoProducto.id, nombre: nuevoProducto.nombre });

      Toast.show({
        type: "success",
        text1: "Producto creado",
        text2: "La publicacion se guardo correctamente.",
      });

      router.replace({
        pathname: ROUTES.productDetail,
        params: { id: nuevoProducto.id },
      });
    } catch (error) {
      const message = error instanceof Error
        ? error.message
        : typeof error === "object" && error !== null && "message" in error
          ? String(error.message)
          : String(error || "No se pudo crear el producto.");
      Toast.show({ type: "error", text1: "Error al crear", text2: message });
    }
  });

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 84 : 0}
    >
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 24 }]}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.title}>Nueva Publicacion</Text>
        {empresaActiva ? (
          <Text style={styles.companyBanner}>
            Publicando como {empresaActiva.nombre}
            {empresaActiva.estado !== "verificada" ? " (pendiente de verificación: todavía no podés publicar)" : ""}
          </Text>
        ) : null}

        <InputField
          control={control}
          name="nombre"
          label="Nombre"
          placeholder="Campera denim oversize"
        />

        <InputField
          control={control}
          name="precio"
          label="Precio"
          placeholder="35000"
          textInputProps={{ keyboardType: "numeric" }}
        />

        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>Aplicar descuento</Text>
          <Switch
            value={descuentoActivo}
            onValueChange={(value) =>
              setValue("descuentoActivo", value, { shouldValidate: true, shouldDirty: true })
            }
            trackColor={{ true: Colors.secondary, false: "#CFCFCF" }}
          />
        </View>

        {descuentoActivo ? (
          <InputField
            control={control}
            name="descuentoPorcentaje"
            label="Descuento (%)"
            placeholder="10"
            textInputProps={{ keyboardType: "numeric" }}
          />
        ) : null}

        {empresaActiva ? (
          <StockPorSede
            sedes={sedesEditables}
            valores={stockSedes}
            onChange={(sedeId, valor) => setStockSedes((actual) => ({ ...actual, [sedeId]: valor }))}
          />
        ) : (
          <InputField
            control={control}
            name="stock"
            label="Stock"
            placeholder="10"
            textInputProps={{
              keyboardType: "numeric",
            }}
          />
        )}

        <SelectorImagenes
          imagenes={imagenes}
          onChange={setImagenes}
          onSubiendoChange={setUploadingImage}
          deshabilitado={isSubmitting}
        />

        <CategoriaProductoSelector control={control} />

        <InputField
          control={control}
          name="talle"
          label="Talles"
          placeholder="Separar en comas: S, M, L"
          textInputProps={{ autoCapitalize: "characters" }}
        />

        <ColoresSelector control={control} />

        {empresaActiva ? null : (
          <>
            <Text style={styles.addressTitle}>Dirección de retiro</Text>
            <SelectorDireccion
              direcciones={direcciones}
              value={direccionElegida}
              onChange={setDireccion}
            />
          </>
        )}

        <InputField
          control={control}
          name="descripcion"
          label="Descripcion"
          placeholder="Describe la prenda"
          textInputProps={{ multiline: true, numberOfLines: 4 }}
        />

        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>Disponible</Text>
          <Switch
            value={disponible}
            onValueChange={(value) =>
              setValue("disponible", value, { shouldValidate: true })
            }
            trackColor={{ true: Colors.secondary, false: "#CFCFCF" }}
          />
        </View>

        {Object.keys(errors).length > 0 ? (
          <Text style={styles.helperText}>
            Revisa los campos marcados antes de enviar.
          </Text>
        ) : null}

        <Pressable
          disabled={isSubmitting || uploadingImage}
          onPress={() => void onSubmit()}
          style={[
            styles.submitButton,
            (isSubmitting || uploadingImage) && styles.submitDisabled,
          ]}
        >
          <Text style={styles.submitText}>
            {isSubmitting ? "Guardando..." : "Crear Publicacion"}
          </Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  companyBanner: {
    backgroundColor: Colors.tertiary,
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    color: Colors.primary,
    fontFamily: "Montserrat_600SemiBold",
  },
  screen: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  accessDenied: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 28,
  },
  accessDeniedText: {
    color: Colors.textMuted,
    fontSize: 15,
    textAlign: "center",
    fontFamily: "Montserrat_500Medium",
  },
  backHomeButton: {
    marginTop: 22,
    minHeight: 46,
    paddingHorizontal: 20,
    borderRadius: Radius.md,
    backgroundColor: Colors.tertiary,
    alignItems: "center",
    justifyContent: "center",
  },
  backHomeText: {
    color: Colors.text,
    fontSize: 15,
    fontFamily: "Montserrat_700Bold",
  },
  content: {
    width: "100%",
    maxWidth: 800,
    alignSelf: "center",
    paddingHorizontal: 16,
    paddingVertical: 24,
    paddingBottom: 40,
  },
  title: {
    fontSize: 24,
    color: Colors.primary,
    marginBottom: 16,
    fontFamily: "Montserrat_700Bold",
  },
  switchRow: {
    minHeight: 48,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 4,
  },
  switchLabel: {
    color: Colors.primary,
    fontSize: 14,
    fontFamily: "Montserrat_600SemiBold",
  },
  helperText: {
    marginTop: 10,
    color: Colors.textMuted,
    fontSize: 12,
    fontFamily: "Montserrat_500Medium",
  },
  addressTitle: {
    marginTop: Spacing.sm,
    marginBottom: Spacing.sm,
    color: Colors.primary,
    fontSize: 14,
    fontFamily: "Montserrat_600SemiBold",
  },
  submitButton: {
    marginTop: 18,
    minHeight: 48,
    borderRadius: Radius.md,
    backgroundColor: Colors.secondary,
    alignItems: "center",
    justifyContent: "center",
  },
  submitDisabled: {
    opacity: 0.55,
  },
  submitText: {
    color: "#2D1F16",
    fontSize: 16,
    fontFamily: "Montserrat_700Bold",
  },
});
