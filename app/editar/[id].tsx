import { zodResolver } from "@hookform/resolvers/zod";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import {
  Platform,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";

import { ErrorView } from "../../components/ui/ErrorView";
import { InputField } from "../../components/ui/InputField";
import { CategoriaProductoSelector } from "../../components/ui/CategoriaProductoSelector";
import { ColoresSelector } from "../../components/ui/ColoresSelector";
import { BotonInfoComision, InfoComision } from "../../components/ui/InfoComision";
import { TallesSelector } from "../../components/ui/TallesSelector";
import { formatearPrecioInput } from "../../utils/precio";
import { CATEGORIA_PRODUCTO_POR_DEFECTO } from "../../constants/categoriasProductos";
import { SkeletonList } from "../../components/ui/SkeletonList";
import { ROUTES } from "../../constants/routes";
import { Colors, Radius, Spacing } from "../../constants/theme";
import { useProductoById } from "../../hooks/useProductoById";
import {
  DESCRIPCION_MAX,
  NOMBRE_MAX,
  ProductoFormOutput,
  ProductoFormValues,
  productoSchema,
} from "../../schemas/productoSchema";
import { getStockSedes, ProductoInput, updateProducto } from "../../services/productosService";
import { traducirError } from "../../services/erroresSupabase";
import { encolarBorrador, hayConexion } from "../../services/offlineService";
import { SelectorImagenes } from "../../components/ui/SelectorImagenes";
import { StockPorSede } from "../../components/ui/StockPorSede";
import { usePuedeGestionarProducto } from "../../hooks/usePuedeVender";
import { useSedesEmpresa } from "../../hooks/useSedesEmpresa";
import { puede, useEmpresaStore } from "../../stores/useEmpresaStore";

// Teclado con punto y coma para "35.000" o "1.500,50".
const TECLADO_PRECIO = Platform.OS === "ios" ? "numbers-and-punctuation" : "numeric";

const DEFAULT_VALUES: ProductoFormValues = {
  nombre: "",
  precio: "",
  descuentoActivo: false,
  descuentoPorcentaje: "0",
  stock: "1",
  imagen: "",
  imagenes: [],
  categoria: "Camisas",
  ...CATEGORIA_PRODUCTO_POR_DEFECTO,
  condicion: "nuevo",
  disponible: true,
  talle: "",
  colores: "",
  descripcion: "",
};

export default function EditarProductoScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { producto, cargando, error, refrescar } = useProductoById(id);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [infoComision, setInfoComision] = useState(false);
  const puedeGestionar = usePuedeGestionarProducto(producto);

  // Prendas de empresa: stock por sede y permiso de precio según el rol en esa empresa.
  const membresia = useEmpresaStore(
    (state) => state.membresias.find((item) => item.empresaId === producto?.empresaId) ?? null,
  );
  const { editables: sedesEditables, soloLectura: sedesSoloLectura } = useSedesEmpresa(membresia);
  const [stockSedes, setStockSedes] = useState<Record<number, string>>({});
  const [stockGuardado, setStockGuardado] = useState<Record<number, number>>({});
  const [stockCambiado, setStockCambiado] = useState(false);
  const esDeEmpresa = Boolean(producto?.empresaId);
  const puedeCambiarPrecio = !esDeEmpresa || puede(membresia, "productos.precio");

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
  const descuentoActivo = watch("descuentoActivo");
  const precioEscrito = watch("precio");
  const descuentoEscrito = watch("descuentoPorcentaje");
  const imagenes = watch("imagenes") ?? [];
  const setImagenes = (lista: string[]) => {
    setValue("imagenes", lista, { shouldValidate: true, shouldDirty: true });
    setValue("imagen", lista[0] ?? "", { shouldValidate: true });
  };

  useEffect(() => {
    if (!producto) {
      return;
    }

    reset({
      nombre: producto.nombre,
      precio: formatearPrecioInput(producto.precio),
      descuentoActivo: producto.descuentoPorcentaje > 0,
      descuentoPorcentaje: producto.descuentoPorcentaje.toString(),
      stock: producto.stock.toString(),
      imagen: producto.imagen,
      imagenes: (producto.imagenes?.length ? producto.imagenes : [producto.imagen]).filter(Boolean).slice(0, 5),
      categoria: producto.categoria as ProductoFormValues["categoria"],
      tipoPrenda:
        producto.categoriaProducto?.tipoPrenda ??
        CATEGORIA_PRODUCTO_POR_DEFECTO.tipoPrenda,
      temporada:
        producto.categoriaProducto?.temporada ??
        CATEGORIA_PRODUCTO_POR_DEFECTO.temporada,
      condicion: producto.condicion ?? "nuevo",
      publico:
        producto.categoriaProducto?.publico ??
        CATEGORIA_PRODUCTO_POR_DEFECTO.publico,
      disponible: producto.disponible,
      talle: (producto.talle ?? []).join(", "),
      colores: (producto.colores ?? []).join(", "),
      descripcion: producto.descripcion,
    });
  }, [producto, reset]);

  useEffect(() => {
    if (!producto?.empresaId) {
      return;
    }

    getStockSedes(producto.id)
      .then((filas) => {
        const cantidades = Object.fromEntries(filas.map((fila) => [fila.sedeId, fila.cantidad]));
        setStockGuardado(cantidades);
        setStockSedes(Object.fromEntries(filas.map((fila) => [fila.sedeId, String(fila.cantidad)])));
        setStockCambiado(false);
      })
      .catch(() => {});
  }, [producto?.id, producto?.empresaId]);

  const accesoDenegado = () => {
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
  };

  const onSubmit = handleSubmit(async (values) => {
    if (!id) {
      return;
    }

    try {
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
        condicion: values.condicion,
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
      };

      if (producto?.empresaId && producto.sedeId) {
        payload.empresa = {
          empresaId: producto.empresaId,
          sedeId: producto.sedeId,
          stockPorSede: sedesEditables.map((sede) => ({
            sedeId: sede.id,
            cantidad: Number(stockSedes[sede.id]) || 0,
          })),
        };
      }

      // Sin conexión la edición queda como borrador local y se sube al volver la red.
      if (!(await hayConexion())) {
        await encolarBorrador({ tipo: "edicion", productoId: id, payload });
        Toast.show({
          type: "offline",
          text1: "Sin conexión. Cambios guardados en borradores.",
          text2: "Se van a subir al recuperar la red (se guardan 7 días).",
        });
        router.replace(ROUTES.myProducts);
        return;
      }

      const actualizado = await updateProducto(id, payload);

      if (actualizado.estado === "borrador") {
        Toast.show({
          type: "offline",
          text1: "Guardado como borrador",
          text2: "Agregá al menos una foto para publicarla.",
        });
        router.replace({ pathname: ROUTES.myProducts, params: { vista: "borradores" } });
        return;
      }

      Toast.show({
        type: "success",
        text1: "Producto actualizado",
        text2: "Los cambios se guardaron.",
      });

      router.replace({ pathname: ROUTES.productDetail, params: { id } });
    } catch (err) {
      const message = traducirError(err);
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

  if (!puedeGestionar) {
    return accesoDenegado();
  }

  const guardarDeshabilitado =
    isSubmitting || uploadingImage || !isValid || (!isDirty && !stockCambiado);

  return (
    <View style={styles.screen}>
      <KeyboardAwareScrollView bottomOffset={24}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 24 }]}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.title}>Editar Publicacion</Text>

        <InputField
          control={control}
          name="nombre"
          label="Nombre"
          placeholder="Campera denim oversize"
          textInputProps={{ maxLength: NOMBRE_MAX }}
        />

        <InputField
          control={control}
          name="precio"
          label={puedeCambiarPrecio ? "Precio" : "Precio (tu rol no puede cambiarlo)"}
          placeholder="35.000 o 1.500,50"
          textInputProps={{ keyboardType: TECLADO_PRECIO, editable: puedeCambiarPrecio }}
          labelExtra={
            <BotonInfoComision abierto={infoComision} onPress={() => setInfoComision((valor) => !valor)} />
          }
        />
        <InfoComision
          precio={precioEscrito}
          descuentoPorcentaje={descuentoActivo ? descuentoEscrito : 0}
          mostrarInfo={infoComision}
        />

        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>Aplicar descuento</Text>
          <Switch
            value={descuentoActivo}
            disabled={!puedeCambiarPrecio}
            onValueChange={(value) =>
              setValue("descuentoActivo", value, { shouldValidate: true, shouldDirty: true })
            }
            trackColor={{ true: Colors.secondary, false: Colors.switchOff }}
          />
        </View>

        {descuentoActivo ? (
          <InputField
            control={control}
            name="descuentoPorcentaje"
            label="Descuento (%)"
            placeholder="10"
            textInputProps={{ keyboardType: "numeric", editable: puedeCambiarPrecio }}
          />
        ) : null}

        {esDeEmpresa ? (
          <StockPorSede
            sedes={sedesEditables}
            valores={stockSedes}
            onChange={(sedeId, valor) => {
              setStockSedes((actual) => ({ ...actual, [sedeId]: valor }));
              setStockCambiado(true);
            }}
            sedesSoloLectura={sedesSoloLectura}
            cantidadesSoloLectura={stockGuardado}
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

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Condición</Text>
          <View style={styles.condicionRow}>
            {(['nuevo', 'usado'] as const).map((opcion) => (
              <Pressable
                key={opcion}
                onPress={() => setValue("condicion", opcion, { shouldValidate: true, shouldDirty: true })}
                style={[
                  styles.condicionOption,
                  watch("condicion") === opcion && styles.condicionOptionActive,
                ]}
              >
                <Text
                  style={[
                    styles.condicionText,
                    watch("condicion") === opcion && styles.condicionTextActive,
                  ]}
                >
                  {opcion === "nuevo" ? "Nuevo" : "Usado"}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        <TallesSelector control={control} />

        <ColoresSelector control={control} />

        <InputField
          control={control}
          name="descripcion"
          label={`Descripción (hasta ${DESCRIPCION_MAX} caracteres)`}
          placeholder="Describe la prenda"
          textInputProps={{ multiline: true, numberOfLines: 2, maxLength: DESCRIPCION_MAX }}
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
            trackColor={{ true: Colors.secondary, false: Colors.switchOff }}
          />
        </View>

        <Pressable
          disabled={guardarDeshabilitado}
          onPress={() => void onSubmit()}
          style={[styles.submitButton, guardarDeshabilitado && styles.submitDisabled]}
        >
          <Text style={styles.submitText}>
            {isSubmitting ? "Guardando..." : "Guardar Cambios"}
          </Text>
        </Pressable>
      </KeyboardAwareScrollView>
    </View>
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
  fieldGroup: {
    marginTop: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  label: {
    color: Colors.primary,
    fontSize: 14,
    marginBottom: 8,
    fontFamily: "Montserrat_600SemiBold",
  },
  condicionRow: {
    flexDirection: "row",
    gap: 8,
  },
  condicionOption: {
    flex: 1,
    minHeight: 44,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  condicionOptionActive: {
    backgroundColor: Colors.secondary,
    borderColor: Colors.secondary,
  },
  condicionText: {
    color: Colors.primary,
    fontSize: 14,
    fontFamily: "Montserrat_600SemiBold",
  },
  condicionTextActive: {
    color: Colors.textStrong,
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
    color: Colors.textStrong,
    fontSize: 16,
    fontFamily: "Montserrat_700Bold",
  },
});
