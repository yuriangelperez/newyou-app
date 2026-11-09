import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import Toast from "react-native-toast-message";

import { Colors, FontSize, Radius, Spacing } from "../constants/theme";
import { abrirReclamo, MOTIVOS_RECLAMO, MotivoReclamo, Reclamo } from "../services/liquidacionesService";

const TEXTO_ESTADO: Record<Reclamo["estado"], string> = {
  abierto: "Reclamo en revisión: New You lee el chat del pedido y te responde.",
  a_favor_comprador: "Reclamo resuelto a favor del comprador.",
  a_favor_vendedor: "Reclamo resuelto a favor del vendedor.",
};

interface ReclamoPedidoProps {
  pedidoId: number;
  reclamo?: Reclamo;
  /** Sólo el comprador puede abrir un reclamo (la base controla el plazo de 10 días desde la entrega). */
  puedeAbrir: boolean;
  onAbierto: (reclamo: Reclamo) => void;
}

/** "Tengo un problema": reclamo del comprador sobre un pedido entregado, o su estado si ya existe. */
export function ReclamoPedido({ pedidoId, reclamo, puedeAbrir, onAbierto }: ReclamoPedidoProps) {
  const [abierto, setAbierto] = useState(false);
  const [motivo, setMotivo] = useState<MotivoReclamo | null>(null);
  const [descripcion, setDescripcion] = useState("");
  const [enviando, setEnviando] = useState(false);

  if (reclamo) {
    return (
      <View style={styles.caja} testID={`reclamo-estado-${pedidoId}`}>
        <Text style={[styles.texto, reclamo.estado === "abierto" && styles.alerta]}>{TEXTO_ESTADO[reclamo.estado]}</Text>
        {reclamo.resolucion ? <Text style={styles.muted}>{reclamo.resolucion}</Text> : null}
      </View>
    );
  }
  if (!puedeAbrir) return null;

  if (!abierto) {
    return (
      <Pressable testID={`reclamo-abrir-${pedidoId}`} accessibilityRole="button" onPress={() => setAbierto(true)}>
        <Text style={[styles.link, styles.alerta]}>Tengo un problema con este pedido</Text>
      </Pressable>
    );
  }

  const valido = motivo !== null && descripcion.trim().length >= 10;

  const enviar = async () => {
    if (!motivo) return;
    try {
      setEnviando(true);
      const nuevo = await abrirReclamo(pedidoId, motivo, descripcion);
      Toast.show({ type: "success", text1: "Reclamo enviado", text2: "Te avisamos cuando se resuelva." });
      onAbierto(nuevo);
    } catch (e) {
      Toast.show({ type: "error", text1: "No se pudo enviar", text2: e instanceof Error ? e.message : undefined });
    } finally {
      setEnviando(false);
    }
  };

  return (
    <View style={styles.caja} testID={`reclamo-form-${pedidoId}`}>
      <Text style={styles.texto}>¿Qué pasó? Primero intentá resolverlo por el chat con el vendedor.</Text>
      <View style={styles.chips}>
        {MOTIVOS_RECLAMO.map((opcion) => {
          const activo = motivo === opcion.valor;
          return (
            <Pressable
              key={opcion.valor}
              onPress={() => setMotivo(opcion.valor)}
              style={[styles.chip, activo && styles.chipActivo]}
            >
              <Text style={[styles.chipTexto, activo && styles.chipTextoActivo]}>{opcion.texto}</Text>
            </Pressable>
          );
        })}
      </View>
      <TextInput
        testID={`reclamo-descripcion-${pedidoId}`}
        value={descripcion}
        onChangeText={setDescripcion}
        maxLength={1000}
        multiline
        placeholder="Contanos el problema (mínimo 10 caracteres)"
        placeholderTextColor={Colors.textMuted}
        style={styles.input}
      />
      <View style={styles.acciones}>
        <Pressable onPress={() => setAbierto(false)}>
          <Text style={styles.link}>Cancelar</Text>
        </Pressable>
        <Pressable
          testID={`reclamo-enviar-${pedidoId}`}
          disabled={!valido || enviando}
          onPress={() => void enviar()}
          style={!valido || enviando ? styles.deshabilitado : undefined}
        >
          <Text style={[styles.link, styles.alerta]}>{enviando ? "Enviando..." : "Enviar reclamo"}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  caja: { gap: Spacing.xs, marginTop: Spacing.xs },
  texto: { color: Colors.text, fontSize: FontSize.sm },
  muted: { color: Colors.textMuted, fontSize: FontSize.sm },
  alerta: { color: Colors.danger },
  link: { color: Colors.secondary, fontSize: FontSize.sm, fontWeight: "700", marginTop: Spacing.xs },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: Spacing.xs },
  chip: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
  },
  chipActivo: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  chipTexto: { color: Colors.text, fontSize: FontSize.sm },
  chipTextoActivo: { color: Colors.background },
  input: {
    minHeight: 70,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    color: Colors.text,
    paddingHorizontal: Spacing.sm,
    textAlignVertical: "top",
  },
  acciones: { flexDirection: "row", gap: Spacing.md },
  deshabilitado: { opacity: 0.5 },
});
