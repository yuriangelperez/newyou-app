import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";

import { EncabezadoPantalla } from "../../components/ui/EncabezadoPantalla";
import { ROUTES } from "../../constants/routes";
import { estilosFormulario as styles } from "../../constants/estilosFormulario";
import { Colors, Spacing } from "../../constants/theme";
import {
  actualizarEmpresa,
  Empresa,
  EstadoEmpresa,
  nombreRol,
  obtenerEmpresa,
  quitarMiembro,
} from "../../services/empresasService";
import { confirmar } from "../../services/confirmar";
import { puede, selectEmpresaActiva, useEmpresaStore } from "../../stores/useEmpresaStore";
import { useUsuarioStore } from "../../stores/useUsuarioStore";

const TEXTO_ESTADO: Record<EstadoEmpresa, string> = {
  pendiente: "Pendiente de verificación",
  verificada: "Verificada",
  suspendida: "Suspendida",
};

export default function PanelEmpresaScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const usuarioId = useUsuarioStore((state) => state.usuario?.id);
  const membresias = useEmpresaStore((state) => state.membresias);
  const membresia = useEmpresaStore(selectEmpresaActiva);
  const setEmpresaActiva = useEmpresaStore((state) => state.setEmpresaActiva);
  const [empresa, setEmpresa] = useState<Empresa | null>(null);
  const [descripcion, setDescripcion] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  const empresaId = membresia?.empresaId;

  useFocusEffect(
    useCallback(() => {
      if (!empresaId) return;
      setError(null);
      obtenerEmpresa(empresaId)
        .then((datos) => {
          setEmpresa(datos);
          setDescripcion(datos.descripcion ?? "");
        })
        .catch((err) => setError(err instanceof Error ? err.message : "No se pudo cargar la empresa."));
    }, [empresaId]),
  );

  if (!membresia) {
    return (
      <View style={styles.screen}>
        <EncabezadoPantalla titulo="MI EMPRESA" />
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.empty}>
            {membresias.length > 0 ? "Elegí con qué empresa querés trabajar." : "Todavía no sos parte de ninguna empresa."}
          </Text>
          {membresias.map((item) => (
            <Pressable key={item.empresaId} style={styles.card} onPress={() => void setEmpresaActiva(item.empresaId)}>
              <Text style={styles.cardTitle}>{item.nombre}</Text>
              <Text style={styles.muted}>{nombreRol(item.rol)}</Text>
            </Pressable>
          ))}
          <Pressable style={styles.saveButton} onPress={() => router.push(ROUTES.newCompany)}>
            <Text style={styles.saveText}>Crear una empresa</Text>
          </Pressable>
        </ScrollView>
      </View>
    );
  }

  const puedeEditar = puede(membresia, "empresa.editar");

  const onGuardar = async () => {
    try {
      setGuardando(true);
      await actualizarEmpresa(membresia.empresaId, { descripcion });
      Toast.show({ type: "success", text1: "Datos guardados" });
    } catch (err) {
      Toast.show({ type: "error", text1: "No se pudo guardar", text2: err instanceof Error ? err.message : undefined });
    } finally {
      setGuardando(false);
    }
  };

  const onSalir = async () => {
    if (!usuarioId) return;
    if (!(await confirmar("Salir de la empresa", `¿Dejar de ser parte de ${membresia.nombre}?`, "Salir"))) return;

    try {
      await quitarMiembro(membresia.empresaId, usuarioId);
      await setEmpresaActiva(null);
      await useEmpresaStore.getState().cargar();
      router.back();
    } catch (err) {
      Toast.show({ type: "error", text1: "No se pudo salir", text2: err instanceof Error ? err.message : undefined });
    }
  };

  return (
    <View style={styles.screen}>
      <EncabezadoPantalla titulo={membresia.nombre.toUpperCase()} />
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + Spacing.xl }]}
        keyboardShouldPersistTaps="handled"
      >
        {error ? <Text style={styles.error}>{error}</Text> : null}
        {membresia.estado === "pendiente" ? (
          <Text style={styles.aviso}>
            Tu empresa está pendiente de verificación. Ya podés armar sedes y equipo; la tienda se muestra al
            público cuando se verifique el CUIT.
          </Text>
        ) : null}
        {membresia.estado === "suspendida" ? (
          <Text style={[styles.aviso, styles.danger]}>
            Tu empresa está suspendida: la tienda no se muestra y no se pueden gestionar publicaciones ni
            pedidos. Escribinos para revisar el caso.
          </Text>
        ) : null}

        <View style={styles.card}>
          <View style={styles.cardRow}>
            <Text style={styles.cardTitle}>{empresa?.razonSocial ?? membresia.nombre}</Text>
            <Text style={styles.badge}>{TEXTO_ESTADO[membresia.estado]}</Text>
          </View>
          {empresa ? <Text style={styles.muted}>CUIT {empresa.cuit}</Text> : <ActivityIndicator color={Colors.primary} />}
          <Text style={styles.muted}>Tu rol: {nombreRol(membresia.rol)}</Text>
          {puedeEditar ? (
            <>
              <Text style={styles.label}>Descripción</Text>
              <TextInput
                value={descripcion}
                onChangeText={setDescripcion}
                multiline
                style={[styles.input, styles.inputMultilinea]}
                placeholderTextColor={Colors.textMuted}
              />
              <Pressable disabled={guardando} onPress={() => void onGuardar()}>
                <Text style={styles.link}>{guardando ? "Guardando..." : "Guardar descripción"}</Text>
              </Pressable>
            </>
          ) : empresa?.descripcion ? (
            <Text style={styles.cardText}>{empresa.descripcion}</Text>
          ) : null}
        </View>

        <Pressable style={styles.card} onPress={() => router.push(ROUTES.companyBranches)}>
          <Text style={styles.cardTitle}>Sedes</Text>
          <Text style={styles.muted}>Direcciones, horarios, retiro y envío</Text>
        </Pressable>
        <Pressable style={styles.card} onPress={() => router.push(ROUTES.companyTeam)}>
          <Text style={styles.cardTitle}>Equipo</Text>
          <Text style={styles.muted}>Miembros, roles e invitaciones</Text>
        </Pressable>
        <Pressable
          style={styles.card}
          onPress={() => router.push({ pathname: ROUTES.store, params: { slug: membresia.slug } })}
        >
          <Text style={styles.cardTitle}>Ver la tienda</Text>
          <Text style={styles.muted}>Así ven tu página los compradores</Text>
        </Pressable>

        <View style={styles.actions}>
          <Pressable onPress={() => void setEmpresaActiva(null)}>
            <Text style={styles.link}>Actuar como yo</Text>
          </Pressable>
          <Pressable onPress={() => void onSalir()}>
            <Text style={[styles.link, styles.danger]}>Salir de la empresa</Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}
