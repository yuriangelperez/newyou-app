import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { ActivityIndicator, Platform, Pressable, Share, Text, TextInput, View } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";

import { EncabezadoPantalla } from "../../components/ui/EncabezadoPantalla";
import { estilosFormulario as styles } from "../../constants/estilosFormulario";
import { Colors, Spacing } from "../../constants/theme";
import {
  cambiarRolMiembro,
  cancelarInvitacion,
  Invitacion,
  invitarMiembro,
  listarEquipo,
  listarInvitaciones,
  listarSedes,
  mensajeInvitacion,
  MiembroEquipo,
  nombreRol,
  quitarMiembro,
  RolEmpresa,
  ROLES_EMPRESA,
  Sede,
} from "../../services/empresasService";
import { confirmar } from "../../services/confirmar";
import { puede, selectEmpresaActiva, useEmpresaStore } from "../../stores/useEmpresaStore";
import { useUsuarioStore } from "../../stores/useUsuarioStore";

// Propietario y administrador siempre ven todas las sedes.
const rolConAlcance = (rol: RolEmpresa) => rol === "vendedor" || rol === "envios";

function Chips<T extends string | number>({
  opciones,
  activas,
  onPress,
}: {
  opciones: { valor: T; texto: string }[];
  activas: T[];
  onPress: (valor: T) => void;
}) {
  return (
    <View style={styles.chips}>
      {opciones.map((opcion) => {
        const activa = activas.includes(opcion.valor);
        return (
          <Pressable key={opcion.valor} onPress={() => onPress(opcion.valor)} style={[styles.chip, activa && styles.chipActivo]}>
            <Text style={[styles.chipTexto, activa && styles.chipTextoActivo]}>{opcion.texto}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export default function EquipoScreen() {
  const insets = useSafeAreaInsets();
  const usuarioId = useUsuarioStore((state) => state.usuario?.id);
  const membresia = useEmpresaStore(selectEmpresaActiva);
  const [equipo, setEquipo] = useState<MiembroEquipo[]>([]);
  const [invitaciones, setInvitaciones] = useState<Invitacion[]>([]);
  const [sedes, setSedes] = useState<Sede[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [email, setEmail] = useState("");
  const [rol, setRol] = useState<RolEmpresa>("vendedor");
  const [sedesElegidas, setSedesElegidas] = useState<number[]>([]);
  const [invitando, setInvitando] = useState(false);
  const [cambiandoRol, setCambiandoRol] = useState<string | null>(null);

  const empresaId = membresia?.empresaId;
  const gestiona = puede(membresia, "equipo.gestionar");
  const soyPropietario = membresia?.rol === "propietario";

  const recargar = useCallback(async () => {
    if (!empresaId) return;
    try {
      setError(null);
      const [miembros, sedesEmpresa] = await Promise.all([listarEquipo(empresaId), listarSedes(empresaId)]);
      setEquipo(miembros);
      setSedes(sedesEmpresa);
      setInvitaciones(gestiona ? await listarInvitaciones(empresaId) : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo cargar el equipo.");
    } finally {
      setCargando(false);
    }
  }, [empresaId, gestiona]);

  useFocusEffect(
    useCallback(() => {
      void recargar();
    }, [recargar]),
  );

  const avisarError = (titulo: string, err: unknown) =>
    Toast.show({ type: "error", text1: titulo, text2: err instanceof Error ? err.message : undefined });

  const alcance = (todas: boolean, ids: number[]) =>
    todas ? "Todas las sedes" : sedes.filter((sede) => ids.includes(sede.id)).map((sede) => sede.nombre).join(", ") || "Sin sedes";

  // En el navegador Share no siempre existe: se usa navigator.share o se copia el texto.
  const compartir = async (invitacion: Invitacion) => {
    if (!membresia) return;
    const message = mensajeInvitacion(membresia.nombre, invitacion);

    try {
      if (Platform.OS !== "web") {
        await Share.share({ message });
      } else if (typeof navigator !== "undefined" && navigator.share) {
        await navigator.share({ text: message });
      } else {
        await navigator.clipboard.writeText(message);
        Toast.show({ type: "success", text1: "Invitación copiada", text2: `Código ${invitacion.codigo}` });
      }
    } catch {
      // Cancelado por el usuario o sin permiso para copiar: el código queda visible en la lista.
      Toast.show({ type: "info", text1: `Código de invitación: ${invitacion.codigo}` });
    }
  };

  const onInvitar = async () => {
    if (!empresaId || !membresia) return;
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
      Toast.show({ type: "error", text1: "Ingresá un correo válido" });
      return;
    }
    try {
      setInvitando(true);
      const invitacion = await invitarMiembro(
        empresaId,
        email,
        rol,
        rolConAlcance(rol) && sedesElegidas.length > 0 ? sedesElegidas : "todas",
      );
      setEmail("");
      setSedesElegidas([]);
      await recargar();
      await compartir(invitacion);
    } catch (err) {
      avisarError("No se pudo invitar", err);
    } finally {
      setInvitando(false);
    }
  };

  // Elección del rol en la misma tarjeta: Alert con varias opciones no funciona en la web.
  const onElegirRol = async (miembro: MiembroEquipo, nuevoRol: RolEmpresa) => {
    if (!empresaId) return;
    setCambiandoRol(null);
    if (nuevoRol === miembro.rol) return;

    try {
      await cambiarRolMiembro(
        empresaId,
        miembro.usuarioId,
        nuevoRol,
        miembro.todasLasSedes ? "todas" : miembro.sedesPermitidas,
      );
      await recargar();
      if (miembro.usuarioId === usuarioId) await useEmpresaStore.getState().cargar();
    } catch (err) {
      avisarError("No se pudo cambiar el rol", err);
    }
  };

  // Sedes de un vendedor o de envíos, sin cambiarle el rol. Sin ninguna marcada = todas.
  const onAlternarSedeMiembro = async (miembro: MiembroEquipo, sedeId: number) => {
    if (!empresaId) return;
    const actuales = miembro.todasLasSedes ? [] : miembro.sedesPermitidas;
    const nuevas = actuales.includes(sedeId) ? actuales.filter((id) => id !== sedeId) : [...actuales, sedeId];

    try {
      await cambiarRolMiembro(empresaId, miembro.usuarioId, miembro.rol, nuevas.length > 0 ? nuevas : "todas");
      await recargar();
    } catch (err) {
      avisarError("No se pudieron cambiar las sedes", err);
    }
  };

  const onQuitar = async (miembro: MiembroEquipo) => {
    if (!empresaId) return;
    if (!(await confirmar("Quitar del equipo", `¿Quitar a ${miembro.username}?`, "Quitar"))) return;

    try {
      await quitarMiembro(empresaId, miembro.usuarioId);
      await recargar();
    } catch (err) {
      avisarError("No se pudo quitar", err);
    }
  };

  const onCancelarInvitacion = async (id: number) => {
    try {
      await cancelarInvitacion(id);
      await recargar();
    } catch (err) {
      avisarError("No se pudo cancelar", err);
    }
  };

  const alternarSede = (id: number) =>
    setSedesElegidas((actual) => (actual.includes(id) ? actual.filter((item) => item !== id) : [...actual, id]));

  return (
    <View style={styles.screen}>
      <EncabezadoPantalla titulo="EQUIPO" />
      <KeyboardAwareScrollView bottomOffset={24}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + Spacing.xl }]}
        keyboardShouldPersistTaps="handled"
      >
        {!membresia ? <Text style={styles.empty}>Elegí una empresa desde tu perfil.</Text> : null}
        {cargando && membresia ? <ActivityIndicator color={Colors.primary} /> : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}

        {equipo.map((miembro) => {
          const puedeTocar =
            gestiona && miembro.usuarioId !== usuarioId && (soyPropietario || miembro.rol !== "propietario");
          return (
            <View key={miembro.usuarioId} style={styles.card}>
              <View style={styles.cardRow}>
                <Text style={styles.cardTitle}>
                  {miembro.username}
                  {miembro.usuarioId === usuarioId ? " (vos)" : ""}
                </Text>
                <Text style={styles.badge}>{nombreRol(miembro.rol)}</Text>
              </View>
              <Text style={styles.muted}>{miembro.email}</Text>
              <Text style={styles.muted}>{alcance(miembro.todasLasSedes, miembro.sedesPermitidas)}</Text>
              {puedeTocar && cambiandoRol === miembro.usuarioId ? (
                <Chips
                  opciones={ROLES_EMPRESA.filter((item) => soyPropietario || item.codigo !== "propietario").map(
                    (item) => ({ valor: item.codigo, texto: item.nombre }),
                  )}
                  activas={[miembro.rol]}
                  onPress={(nuevoRol) => void onElegirRol(miembro, nuevoRol)}
                />
              ) : null}
              {puedeTocar && cambiandoRol === miembro.usuarioId && rolConAlcance(miembro.rol) && sedes.length > 1 ? (
                <>
                  <Text style={styles.label}>Sedes</Text>
                  <Chips
                    opciones={sedes.map((sede) => ({ valor: sede.id, texto: sede.nombre }))}
                    activas={miembro.todasLasSedes ? [] : miembro.sedesPermitidas}
                    onPress={(sedeId) => void onAlternarSedeMiembro(miembro, sedeId)}
                  />
                  <Text style={styles.muted}>Sin selección = todas las sedes</Text>
                </>
              ) : null}
              {puedeTocar ? (
                <View style={styles.actions}>
                  <Pressable
                    onPress={() => setCambiandoRol(cambiandoRol === miembro.usuarioId ? null : miembro.usuarioId)}
                  >
                    <Text style={styles.link}>{cambiandoRol === miembro.usuarioId ? "Cerrar" : "Editar rol y sedes"}</Text>
                  </Pressable>
                  <Pressable onPress={() => void onQuitar(miembro)}>
                    <Text style={[styles.link, styles.danger]}>Quitar</Text>
                  </Pressable>
                </View>
              ) : null}
            </View>
          );
        })}

        {gestiona ? (
          <>
            {invitaciones.length > 0 ? <Text style={styles.sectionTitle}>Invitaciones pendientes</Text> : null}
            {invitaciones.map((invitacion) => (
              <View key={invitacion.id} style={styles.card}>
                <View style={styles.cardRow}>
                  <Text style={styles.cardTitle}>{invitacion.email}</Text>
                  <Text style={styles.badge}>{nombreRol(invitacion.rol)}</Text>
                </View>
                <Text style={styles.muted}>
                  Código {invitacion.codigo} · vence el {new Date(invitacion.venceEn).toLocaleDateString("es-AR")}
                </Text>
                <View style={styles.actions}>
                  <Pressable onPress={() => void compartir(invitacion)}>
                    <Text style={styles.link}>Compartir</Text>
                  </Pressable>
                  <Pressable onPress={() => void onCancelarInvitacion(invitacion.id)}>
                    <Text style={[styles.link, styles.danger]}>Cancelar</Text>
                  </Pressable>
                </View>
              </View>
            ))}

            <Text style={styles.sectionTitle}>Invitar a alguien</Text>
            <View style={styles.card}>
              <Text style={styles.label}>Correo de su cuenta NewYou</Text>
              <TextInput
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                style={styles.input}
                placeholder="nombre@correo.com"
                placeholderTextColor={Colors.textMuted}
              />
              <Text style={styles.label}>Rol</Text>
              <Chips
                opciones={ROLES_EMPRESA.filter((item) => item.codigo !== "propietario").map((item) => ({
                  valor: item.codigo,
                  texto: item.nombre,
                }))}
                activas={[rol]}
                onPress={setRol}
              />
              {rolConAlcance(rol) && sedes.length > 1 ? (
                <>
                  <Text style={styles.label}>Sedes</Text>
                  <Chips
                    opciones={sedes.map((sede) => ({ valor: sede.id, texto: sede.nombre }))}
                    activas={sedesElegidas}
                    onPress={alternarSede}
                  />
                  <Pressable onPress={() => setSedesElegidas([])}>
                    <Text style={styles.muted}>Sin selección = todas las sedes</Text>
                  </Pressable>
                </>
              ) : null}
              <Pressable
                disabled={invitando}
                onPress={() => void onInvitar()}
                style={[styles.saveButton, invitando && styles.disabled]}
              >
                {invitando ? <ActivityIndicator color={Colors.white} /> : <Text style={styles.saveText}>Invitar y compartir</Text>}
              </Pressable>
            </View>
          </>
        ) : null}
      </KeyboardAwareScrollView>
    </View>
  );
}
