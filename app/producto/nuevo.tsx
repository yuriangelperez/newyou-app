import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "expo-router";
import { useState } from "react";
import { useForm } from "react-hook-form";
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import Toast from "react-native-toast-message";

import { InputField } from "../../components/ui/InputField";
import { CategoriaProductoSelector } from "../../components/ui/CategoriaProductoSelector";
import { ColoresSelector } from "../../components/ui/ColoresSelector";
import { CATEGORIA_PRODUCTO_POR_DEFECTO } from "../../constants/categoriasProductos";
import { ROUTES } from "../../constants/routes";
import { Colors, Radius } from "../../constants/theme";
import {
  ProductoFormOutput,
  ProductoFormValues,
  productoSchema,
} from "../../schemas/productoSchema";
import { createProducto } from "../../services/productosService";
import {
  pickImageFromLibrary,
  uploadProductImage,
} from "../../services/storageService";
import { useUsuarioStore } from "../../stores/useUsuarioStore";

const DEFAULT_VALUES: ProductoFormValues = {
  nombre: "",
  precio: "0",
  stock: "1",
  imagen: "",
  ...CATEGORIA_PRODUCTO_POR_DEFECTO,
  disponible: true,
  talle: "",
  colores: "",
  descripcion: "",
};

export default function NuevoProductoScreen() {
  const router = useRouter();
  const esVendedor = useUsuarioStore(
    (state) => state.usuario?.tipo === "vendedor",
  );
  const [imagePreview, setImagePreview] = useState<string | null>(null);
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

  const disponible = watch("disponible");
  const imageField = watch("imagen");

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

  const onPickAndUploadImage = async () => {
    try {
      setUploadingImage(true);
      const image = await pickImageFromLibrary();

      if (!image) {
        return;
      }

      setImagePreview(image.uri);
      const publicUrl = await uploadProductImage(image);
      setValue("imagen", publicUrl, {
        shouldValidate: true,
        shouldDirty: true,
      });

      Toast.show({
        type: "success",
        text1: "Imagen subida",
        text2: "Se cargo correctamente en Supabase Storage.",
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "No se pudo subir la imagen.";
      Toast.show({ type: "error", text1: "Error de imagen", text2: message });
    } finally {
      setUploadingImage(false);
    }
  };

  const onSubmit = handleSubmit(async (values) => {
    try {
      const talles = values.talle
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);

      const nuevoProducto = await createProducto({
        nombre: values.nombre.trim(),
        precio: values.precio,
        stock: values.stock,
        imagen: values.imagen.trim(),
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
      });

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
      const message =
        error instanceof Error
          ? error.message
          : "No se pudo crear el producto.";
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
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.title}>Nueva Publicacion</Text>

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

        <InputField
          control={control}
          name="stock"
          label="Stock"
          placeholder="10"
          textInputProps={{
            keyboardType: "numeric",
          }}
        />

        <Pressable
          onPress={() => void onPickAndUploadImage()}
          disabled={uploadingImage || isSubmitting}
          style={[
            styles.uploadButton,
            (uploadingImage || isSubmitting) && styles.submitDisabled,
          ]}
        >
          {uploadingImage ? (
            <ActivityIndicator color="#2D1F16" />
          ) : (
            <Text style={styles.uploadButtonText}>
              Seleccionar imagen desde la galería
            </Text>
          )}
        </Pressable>

        {imagePreview || imageField ? (
          <Image
            source={{ uri: imagePreview ?? imageField }}
            style={styles.previewImage}
          />
        ) : null}

        <CategoriaProductoSelector control={control} />

        <InputField
          control={control}
          name="talle"
          label="Talles"
          placeholder="Separar en comas: S, M, L"
          textInputProps={{ autoCapitalize: "characters" }}
        />

        <ColoresSelector control={control} />

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
    paddingHorizontal: 20,
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
  uploadButton: {
    marginTop: 6,
    minHeight: 44,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.secondary,
    backgroundColor: "#EFE5DE",
    alignItems: "center",
    justifyContent: "center",
  },
  uploadButtonText: {
    color: "#2D1F16",
    fontSize: 14,
    fontFamily: "Montserrat_600SemiBold",
  },
  previewImage: {
    width: "100%",
    height: 180,
    borderRadius: Radius.md,
    marginTop: 10,
    backgroundColor: Colors.surface,
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
