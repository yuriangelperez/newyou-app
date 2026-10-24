import { useRouter } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Pressable, Switch, Text, TextInput, View } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";

import { BotonGps } from "../../components/ui/BotonGps";
import { EncabezadoPantalla } from "../../components/ui/EncabezadoPantalla";
import { VerEnMapa } from "../../components/ui/VerEnMapa";
import { ROUTES } from "../../constants/routes";
import { estilosFormulario as styles } from "../../constants/estilosFormulario";
import { Colors, Spacing } from "../../constants/theme";
import { crearEmpresa, cuitValido } from "../../services/empresasService";
import { useEmpresaStore } from "../../stores/useEmpresaStore";

export default function NuevaEmpresaScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [razonSocial, setRazonSocial] = useState("");
  const [nombre, setNombre] = useState("");
  const [cuit, setCuit] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [sedeNombre, setSedeNombre] = useState("Casa central");
  const [sedeDireccion, setSedeDireccion] = useState("");
  const [pedidoMapa, setPedidoMapa] = useState(0);
  const [haceRetiro, setHaceRetiro] = useState(true);
  const [haceEnvio, setHaceEnvio] = useState(false);
  const [guardando, setGuardando] = useState(false);

  const validar = () => {
    if (!razonSocial.trim() || !nombre.trim()) return "Completá la razón social y el nombre de la tienda";
    if (!cuitValido(cuit)) return "El CUIT no es válido (11 dígitos)";
    if (!sedeNombre.trim() || !sedeDireccion.trim()) return "Completá el nombre y la dirección de la sede";
    if (!haceRetiro && !haceEnvio) return "La sede tiene que ofrecer retiro, envío o ambos";
    return null;
  };

  const onCrear = async () => {
    const error = validar();
    if (error) {
      Toast.show({ type: "error", text1: error });
      return;
    }

    try {
      setGuardando(true);
      const empresa = await crearEmpresa({
        razonSocial,
        nombre,
        cuit,
        descripcion,
        sedeNombre,
        sedeDireccion,
        haceRetiro,
        haceEnvio,
      });
      const store = useEmpresaStore.getState();
      await store.cargar();
      await store.setEmpresaActiva(empresa.id);
      Toast.show({
        type: "success",
        text1: "Empresa creada",
        text2: "Queda pendiente hasta que verifiquemos el CUIT.",
      });
      router.replace(ROUTES.companyPanel);
    } catch (err) {
      Toast.show({
        type: "error",
        text1: "No se pudo crear la empresa",
        text2: err instanceof Error ? err.message : "Intenta nuevamente.",
      });
    } finally {
      setGuardando(false);
    }
  };

  return (
    <View style={styles.screen}>
      <EncabezadoPantalla titulo="NUEVA EMPRESA" />
      <KeyboardAwareScrollView bottomOffset={24}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + Spacing.xl }]}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.aviso}>
          Tu cuenta personal queda como propietaria. Podés sumar a tu equipo y más sedes después.
        </Text>

        <Text style={styles.sectionTitle}>Datos de la empresa</Text>
        <View style={styles.card}>
          <Text style={styles.label}>Razón social</Text>
          <TextInput value={razonSocial} onChangeText={setRazonSocial} style={styles.input} placeholder="Moda Sur S.A." placeholderTextColor={Colors.textMuted} />
          <Text style={styles.label}>Nombre de la tienda</Text>
          <TextInput value={nombre} onChangeText={setNombre} style={styles.input} placeholder="Moda Sur" placeholderTextColor={Colors.textMuted} />
          <Text style={styles.label}>CUIT</Text>
          <TextInput
            value={cuit}
            onChangeText={setCuit}
            style={styles.input}
            keyboardType="number-pad"
            placeholder="30-12345678-9"
            placeholderTextColor={Colors.textMuted}
          />
          <Text style={styles.label}>Descripción (opcional)</Text>
          <TextInput
            value={descripcion}
            onChangeText={setDescripcion}
            style={[styles.input, styles.inputMultilinea]}
            multiline
            placeholder="Qué vendés, estilo, marcas..."
            placeholderTextColor={Colors.textMuted}
          />
        </View>

        <Text style={styles.sectionTitle}>Primera sede</Text>
        <View style={styles.card}>
          <Text style={styles.label}>Nombre</Text>
          <TextInput value={sedeNombre} onChangeText={setSedeNombre} style={styles.input} placeholderTextColor={Colors.textMuted} />
          <Text style={styles.label}>Dirección</Text>
          <TextInput
            value={sedeDireccion}
            onChangeText={setSedeDireccion}
            onSubmitEditing={() => setPedidoMapa((n) => n + 1)}
            returnKeyType="search"
            style={styles.input}
            placeholder="Calle, número, ciudad"
            placeholderTextColor={Colors.textMuted}
          />
          <BotonGps onDireccion={setSedeDireccion} direccionActual={sedeDireccion} />
          <VerEnMapa direccion={sedeDireccion} pedido={pedidoMapa} />
          <View style={styles.switchRow}>
            <Text style={styles.cardText}>Retiro en el local</Text>
            <Switch value={haceRetiro} onValueChange={setHaceRetiro} trackColor={{ true: Colors.secondary }} />
          </View>
          <View style={styles.switchRow}>
            <Text style={styles.cardText}>Envío a domicilio</Text>
            <Switch value={haceEnvio} onValueChange={setHaceEnvio} trackColor={{ true: Colors.secondary }} />
          </View>
        </View>

        <Pressable
          disabled={guardando}
          onPress={() => void onCrear()}
          style={[styles.saveButton, guardando && styles.disabled]}
        >
          {guardando ? <ActivityIndicator color={Colors.white} /> : <Text style={styles.saveText}>Crear empresa</Text>}
        </Pressable>
      </KeyboardAwareScrollView>
    </View>
  );
}
