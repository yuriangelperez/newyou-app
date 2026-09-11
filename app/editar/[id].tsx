import { zodResolver } from "@hookform/resolvers/zod";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
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

import { ErrorView } from "../../components/ui/ErrorView";
import { InputField } from "../../components/ui/InputField";
import { CategoriaProductoSelector } from "../../components/ui/CategoriaProductoSelector";
import { ColoresSelector } from "../../components/ui/ColoresSelector";
import { CATEGORIA_PRODUCTO_POR_DEFECTO } from "../../constants/categoriasProductos";
import { SkeletonList } from "../../components/ui/SkeletonList";
import { ROUTES } from "../../constants/routes";
import { Colors, Radius } from "../../constants/theme";
import { useProductoById } from "../../hooks/useProductoById";
import {
  ProductoFormOutput,
  ProductoFormValues,
  productoSchema,
} from "../../schemas/productoSchema";
import { updateProducto } from "../../services/productosService";
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

export default function EditarProductoScreen() {
  const router = useRouter();
  const esVendedor = useUsuarioStore(
    (state) => state.usuario?.tipo === "vendedor",
  );
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { producto, cargando, error, refrescar } = useProductoById(id);
  const [uploadingImage, setUploadingImage] = useState(false);

  const {
    control,
    handleSubmit,
    setValue,
    reset,
    watch,
    formState: { isSubmitting, isDirty, isValid },
  } = useForm<ProductoFormValues, undefined, ProductoFormOutput>({
    resolver: zodResolver(productoSchema),
    mode: "onChange",
    defaultValues: DEFAULT_VALUES,
  });

  const disponible = watch("disponible");
  const imageField = watch("imagen");

  useEffect(() => {
    if (!producto) {
      return;
    }

    reset({
      nombre: producto.nombre,
      precio: producto.precio.toString(),
      stock: producto.stock.toString(),
      imagen: producto.imagen,
      tipoPrenda:
        producto.categoriaProducto?.tipoPrenda ??
        CATEGORIA_PRODUCTO_POR_DEFECTO.tipoPrenda,
      temporada:
        producto.categoriaProducto?.temporada ??
        CATEGORIA_PRODUCTO_POR_DEFECTO.temporada,
      publico:
        producto.categoriaProducto?.publico ??
        CATEGORIA_PRODUCTO_POR_DEFECTO.publico,
      disponible: producto.disponible,
      talle: (producto.talle ?? []).join(", "),
      colores: (producto.colores ?? []).join(", "),
      descripcion: producto.descripcion,
    });
  }, [producto, reset]);

  if (!esVendedor) {
    return (
      <View style={styles.accessDenied}>
        <Text style={styles.title}>Editar publicación</Text>
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

      const publicUrl = await uploadProductImage(image);
      setValue("imagen", publicUrl, {
        shouldValidate: true,
        shouldDirty: true,
      });
      Toast.show({
        type: "success",
        text1: "Imagen actualizada",
        text2: "La nueva imagen se subió correctamente.",
      });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "No se pudo subir la imagen.";
      Toast.show({ type: "error", text1: "Error de imagen", text2: message });
    } finally {
      setUploadingImage(false);
    }
  };

  const onSubmit = handleSubmit(async (values) => {
    if (!id) {
      return;
    }

    try {
      await updateProducto(id, {
        nombre: values.nombre.trim(),
        precio: values.precio,
        stock: values.stock,
        imagen: values.imagen.trim(),
        tipoPrenda: values.tipoPrenda,
        temporada: values.temporada,
        publico: values.publico,
        disponible: values.disponible,
        talle: values.talle
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean),
        colores: values.colores
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean),
        descripcion: values.descripcion.trim(),
      });

      Toast.show({
        type: "success",
        text1: "Producto actualizado",
        text2: "Los cambios se guardaron.",
      });

      router.replace({ pathname: ROUTES.productDetail, params: { id } });
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "No se pudo actualizar el producto.";
      Toast.show({
        type: "error",
        text1: "Error al actualizar",
        text2: message,
      });
    }
  });

  if (cargando) {
    return <SkeletonList />;
  }

  if (error) {
    return <ErrorView message={error} onRetry={() => void refrescar()} />;
  }

  if (!producto) {
    return (
      <ErrorView
        message="No encontramos ese producto."
        onRetry={() => router.replace(ROUTES.home)}
      />
    );
  }

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
        <Text style={styles.title}>Editar Publicacion</Text>

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
              Reemplazar imagen desde la galería
            </Text>
          )}
        </Pressable>

        {imageField ? (
          <Image source={{ uri: imageField }} style={styles.previewImage} />
        ) : null}

        <CategoriaProductoSelector control={control} />

        <InputField
          control={control}
          name="talle"
          label="Talles"
          placeholder="S, M, L"
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
              setValue("disponible", value, {
                shouldValidate: true,
                shouldDirty: true,
              })
            }
            trackColor={{ true: Colors.secondary, false: "#CFCFCF" }}
          />
        </View>

        <Pressable
          disabled={isSubmitting || uploadingImage || !isValid || !isDirty}
          onPress={() => void onSubmit()}
          style={[
            styles.submitButton,
            (isSubmitting || uploadingImage || !isValid || !isDirty) &&
              styles.submitDisabled,
          ]}
        >
          <Text style={styles.submitText}>
            {isSubmitting ? "Guardando..." : "Guardar Cambios"}
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
  switchLabel: {
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
