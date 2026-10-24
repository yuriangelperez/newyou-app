import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";

import { EncabezadoPantalla } from "../components/ui/EncabezadoPantalla";
import { ROUTES } from "../constants/routes";
import { estilosFormulario as styles } from "../constants/estilosFormulario";
import { Colors, Spacing } from "../constants/theme";
import {
  cambiarEstadoEmpresa,
  EmpresaAdmin,
  EstadoEmpresa,
  formatearCuit,
  listarEmpresasAdmin,
} from "../services/empresasService";
import { useUsuarioStore } from "../stores/useUsuarioStore";

const FILTROS: { valor: EstadoEmpresa | null; texto: string }[] = [
  { valor: "pendiente", texto: "Pendientes" },
  { valor: "verificada", texto: "Verificadas" },
  { valor: "suspendida", texto: "Suspendidas" },
  { valor: null, texto: "Todas" },
];

const TEXTO_ESTADO: Record<EstadoEmpresa, string> = {
  pendiente: "Pendiente",
  verificada: "Verificada",
  suspendida: "Suspendida",
};

/** Panel de administrador de la plataforma: revisar y verificar empresas. */
export default function AdminScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const esAdmin = useUsuarioStore((state) => state.usuario?.esAdmin === true);
  const [filtro, setFiltro] = useState<EstadoEmpresa | null>("pendiente");
  const [empresas, setEmpresas] = useState<EmpresaAdmin[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [suspendiendo, setSuspendiendo] = useState<number | null>(null);
  const [motivo, setMotivo] = useState("");
  const [procesando, setProcesando] = useState<number | null>(null);

  const recargar = useCallback(async () => {
    if (!esAdmin) return;
    try {
      setError(null);
      setCargando(true);
      setEmpresas(await listarEmpresasAdmin(filtro));
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudieron cargar las empresas.");
    } finally {
      setCargando(false);
    }
  }, [esAdmin, filtro]);

  useFocusEffect(
    useCallback(() => {
      void recargar();
    }, [recargar]),
  );

  const cambiar = async (empresa: EmpresaAdmin, estado: EstadoEmpresa, motivoTexto?: string) => {
    try {
      setProcesando(empresa.id);
      await cambiarEstadoEmpresa(empresa.id, estado, motivoTexto);
      setSuspendiendo(null);
      setMotivo("");
      Toast.show({ type: "success", text1: `${empresa.nombre}: ${TEXTO_ESTADO[estado].toLowerCase()}` });
      await recargar();
    } catch (err) {
      Toast.show({ type: "error", text1: "No se pudo cambiar el estado", text2: err instanceof Error ? err.message : undefined });
    } finally {
      setProcesando(null);
    }
  };

  if (!esAdmin) {
    return (
      <View style={styles.screen}>
        <EncabezadoPantalla titulo="ADMINISTRADOR" />
        <View style={styles.content}>
          <Text style={styles.empty}>Esta sección es sólo para administradores de NewYou.</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <EncabezadoPantalla titulo="ADMINISTRADOR" />
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + Spacing.xl }]}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.aviso}>
          Antes de verificar, comprobá que el CUIT exista y corresponda a la razón social (por ejemplo, en la
          constancia de inscripción de ARCA).
        </Text>

        <View style={styles.chips}>
          {FILTROS.map((opcion) => {
            const activo = filtro === opcion.valor;
            return (
              <Pressable
                key={opcion.texto}
                onPress={() => setFiltro(opcion.valor)}
                style={[styles.chip, activo && styles.chipActivo]}
              >
                <Text style={[styles.chipTexto, activo && styles.chipTextoActivo]}>{opcion.texto}</Text>
              </Pressable>
            );
          })}
        </View>

        {cargando ? <ActivityIndicator color={Colors.primary} /> : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}
        {!cargando && !error && empresas.length === 0 ? (
          <Text style={styles.empty}>No hay empresas en este estado.</Text>
        ) : null}

        {empresas.map((empresa) => (
          <View key={empresa.id} style={styles.card}>
            <View style={styles.cardRow}>
              <Text style={styles.cardTitle}>{empresa.nombre}</Text>
              <Text style={[styles.badge, empresa.estado === "suspendida" && styles.danger]}>
                {TEXTO_ESTADO[empresa.estado]}
              </Text>
            </View>
            <Text style={styles.cardText}>{empresa.razonSocial}</Text>
            <Text style={styles.muted}>CUIT {formatearCuit(empresa.cuit)}</Text>
            <Text style={styles.muted}>
              Creada por {empresa.creadorEmail ?? "—"} el {new Date(empresa.creadaEl).toLocaleDateString("es-AR")}
            </Text>
            <Text style={styles.muted}>
              {empresa.sedes} sede(s) · {empresa.miembros} miembro(s)
            </Text>
            {empresa.ultimoMotivo ? <Text style={styles.muted}>Último motivo: {empresa.ultimoMotivo}</Text> : null}

            {suspendiendo === empresa.id ? (
              <>
                <TextInput
                  value={motivo}
                  onChangeText={setMotivo}
                  style={styles.input}
                  placeholder="Motivo de la suspensión (lo ve la empresa)"
                  placeholderTextColor={Colors.textMuted}
                />
                <View style={styles.actions}>
                  <Pressable onPress={() => setSuspendiendo(null)}>
                    <Text style={styles.link}>Cancelar</Text>
                  </Pressable>
                  <Pressable
                    disabled={procesando === empresa.id}
                    onPress={() => void cambiar(empresa, "suspendida", motivo)}
                  >
                    <Text style={[styles.link, styles.danger]}>Confirmar suspensión</Text>
                  </Pressable>
                </View>
              </>
            ) : (
              <View style={styles.actions}>
                <Pressable onPress={() => router.push({ pathname: ROUTES.store, params: { slug: empresa.slug } })}>
                  <Text style={styles.link}>Ver tienda</Text>
                </Pressable>
                {empresa.estado !== "verificada" ? (
                  <Pressable disabled={procesando === empresa.id} onPress={() => void cambiar(empresa, "verificada")}>
                    <Text style={styles.link}>{empresa.estado === "suspendida" ? "Reactivar" : "Verificar"}</Text>
                  </Pressable>
                ) : null}
                {empresa.estado !== "suspendida" ? (
                  <Pressable onPress={() => setSuspendiendo(empresa.id)}>
                    <Text style={[styles.link, styles.danger]}>Suspender</Text>
                  </Pressable>
                ) : null}
              </View>
            )}
          </View>
        ))}
      </ScrollView>
    </View>
  );
}
