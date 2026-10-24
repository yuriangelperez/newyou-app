import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Switch, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";

import { BotonGps } from "../../components/ui/BotonGps";
import { EncabezadoPantalla } from "../../components/ui/EncabezadoPantalla";
import { VerEnMapa } from "../../components/ui/VerEnMapa";
import { estilosFormulario as styles } from "../../constants/estilosFormulario";
import { Colors, Spacing } from "../../constants/theme";
import { actualizarSede, crearSede, DatosSede, listarSedes, Sede } from "../../services/empresasService";
import { puede, selectEmpresaActiva, useEmpresaStore } from "../../stores/useEmpresaStore";

const SEDE_VACIA: DatosSede = {
  nombre: "",
  direccion: "",
  horarios: "",
  haceRetiro: true,
  haceEnvio: false,
  costoEnvio: 0,
  activa: true,
};

function FormularioSede({
  inicial,
  textoBoton,
  onGuardar,
}: {
  inicial: DatosSede;
  textoBoton: string;
  onGuardar: (datos: DatosSede) => Promise<void>;
}) {
  const [datos, setDatos] = useState(inicial);
  const [costo, setCosto] = useState(inicial.costoEnvio ? String(inicial.costoEnvio) : "");
  const [guardando, setGuardando] = useState(false);
  const cambiar = (parcial: Partial<DatosSede>) => setDatos((actual) => ({ ...actual, ...parcial }));

  const onPress = async () => {
    const costoEnvio = Number(costo.replace(",", ".")) || 0;
    if (!datos.nombre.trim() || !datos.direccion.trim()) {
      Toast.show({ type: "error", text1: "Completá el nombre y la dirección" });
      return;
    }
    if (!datos.haceRetiro && !datos.haceEnvio) {
      Toast.show({ type: "error", text1: "Elegí retiro, envío o ambos" });
      return;
    }

    setGuardando(true);
    try {
      await onGuardar({ ...datos, costoEnvio });
    } finally {
      setGuardando(false);
    }
  };

  return (
    <View style={styles.card}>
      <Text style={styles.label}>Nombre</Text>
      <TextInput value={datos.nombre} onChangeText={(nombre) => cambiar({ nombre })} style={styles.input} placeholder="Sucursal Pilar" placeholderTextColor={Colors.textMuted} />
      <Text style={styles.label}>Dirección</Text>
      <TextInput value={datos.direccion} onChangeText={(direccion) => cambiar({ direccion })} style={styles.input} placeholder="Calle, número, ciudad" placeholderTextColor={Colors.textMuted} />
      <BotonGps onDireccion={(direccion) => cambiar({ direccion })} />
      <VerEnMapa direccion={datos.direccion} />
      <Text style={styles.label}>Horarios (opcional)</Text>
      <TextInput value={datos.horarios ?? ""} onChangeText={(horarios) => cambiar({ horarios })} style={styles.input} placeholder="Lun a Sáb 9 a 19 h" placeholderTextColor={Colors.textMuted} />
      <View style={styles.switchRow}>
        <Text style={styles.cardText}>Retiro en el local</Text>
        <Switch value={datos.haceRetiro} onValueChange={(haceRetiro) => cambiar({ haceRetiro })} trackColor={{ true: Colors.secondary }} />
      </View>
      <View style={styles.switchRow}>
        <Text style={styles.cardText}>Envío a domicilio</Text>
        <Switch value={datos.haceEnvio} onValueChange={(haceEnvio) => cambiar({ haceEnvio })} trackColor={{ true: Colors.secondary }} />
      </View>
      {datos.haceEnvio ? (
        <>
          <Text style={styles.label}>Costo de envío ($)</Text>
          <TextInput value={costo} onChangeText={setCosto} keyboardType="decimal-pad" style={styles.input} placeholder="0" placeholderTextColor={Colors.textMuted} />
        </>
      ) : null}
      <View style={styles.switchRow}>
        <Text style={styles.cardText}>Sede activa</Text>
        <Switch value={datos.activa} onValueChange={(activa) => cambiar({ activa })} trackColor={{ true: Colors.secondary }} />
      </View>
      <Pressable disabled={guardando} onPress={() => void onPress()} style={[styles.saveButton, guardando && styles.disabled]}>
        {guardando ? <ActivityIndicator color={Colors.white} /> : <Text style={styles.saveText}>{textoBoton}</Text>}
      </Pressable>
    </View>
  );
}

export default function SedesScreen() {
  const insets = useSafeAreaInsets();
  const membresia = useEmpresaStore(selectEmpresaActiva);
  const [sedes, setSedes] = useState<Sede[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editando, setEditando] = useState<number | "nueva" | null>(null);

  const empresaId = membresia?.empresaId;
  const puedeGestionar = puede(membresia, "sedes.gestionar");

  const recargar = useCallback(async () => {
    if (!empresaId) return;
    try {
      setError(null);
      setSedes(await listarSedes(empresaId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudieron cargar las sedes.");
    } finally {
      setCargando(false);
    }
  }, [empresaId]);

  useFocusEffect(
    useCallback(() => {
      void recargar();
    }, [recargar]),
  );

  const guardar = async (accion: () => Promise<void>) => {
    try {
      await accion();
      setEditando(null);
      await recargar();
      Toast.show({ type: "success", text1: "Sede guardada" });
    } catch (err) {
      Toast.show({ type: "error", text1: "No se pudo guardar", text2: err instanceof Error ? err.message : undefined });
    }
  };

  return (
    <View style={styles.screen}>
      <EncabezadoPantalla titulo="SEDES" />
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + Spacing.xl }]}
        keyboardShouldPersistTaps="handled"
      >
        {!membresia ? <Text style={styles.empty}>Elegí una empresa desde tu perfil.</Text> : null}
        {cargando && membresia ? <ActivityIndicator color={Colors.primary} /> : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}

        {sedes.map((sede) =>
          editando === sede.id ? (
            <FormularioSede
              key={sede.id}
              inicial={sede}
              textoBoton="Guardar cambios"
              onGuardar={(datos) => guardar(() => actualizarSede(sede.id, datos))}
            />
          ) : (
            <View key={sede.id} style={styles.card}>
              <View style={styles.cardRow}>
                <Text style={styles.cardTitle}>{sede.nombre}</Text>
                {!sede.activa ? <Text style={[styles.badge, styles.danger]}>Inactiva</Text> : null}
              </View>
              <Text style={styles.cardText}>{sede.direccion}</Text>
              {sede.horarios ? <Text style={styles.muted}>{sede.horarios}</Text> : null}
              <Text style={styles.muted}>
                {[sede.haceRetiro && "Retiro en el local", sede.haceEnvio && `Envío $${sede.costoEnvio}`]
                  .filter(Boolean)
                  .join(" · ")}
              </Text>
              {puedeGestionar ? (
                <Pressable onPress={() => setEditando(sede.id)}>
                  <Text style={styles.link}>Editar</Text>
                </Pressable>
              ) : null}
            </View>
          ),
        )}

        {puedeGestionar ? (
          editando === "nueva" ? (
            <>
              <Text style={styles.sectionTitle}>Nueva sede</Text>
              <FormularioSede
                inicial={SEDE_VACIA}
                textoBoton="Agregar sede"
                onGuardar={(datos) => guardar(() => crearSede(membresia!.empresaId, datos))}
              />
            </>
          ) : (
            <Pressable style={styles.saveButton} onPress={() => setEditando("nueva")}>
              <Text style={styles.saveText}>Agregar sede</Text>
            </Pressable>
          )
        ) : null}
      </ScrollView>
    </View>
  );
}
