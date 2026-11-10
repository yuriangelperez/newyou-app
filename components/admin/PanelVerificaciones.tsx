import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import Toast from 'react-native-toast-message';

import { Colors, FontSize, Radius, Spacing } from '../../constants/theme';
import {
  DecisionVerificacion,
  listarVerificaciones,
  resolverVerificacion,
  textoPlazo,
  VerificacionAdmin,
} from '../../services/verificacionService';
import { EstadoVerificacion } from '../../types';

const FILTROS: { valor: EstadoVerificacion | null; texto: string }[] = [
  { valor: 'pendiente', texto: 'Pendientes' },
  { valor: 'requiere_cambios', texto: 'Esperando al vendedor' },
  { valor: 'aprobada', texto: 'Aprobadas' },
  { valor: 'rechazada', texto: 'Rechazadas' },
];

/** Cola de prendas usadas para verificar: la que vence antes, primero. */
export function PanelVerificaciones() {
  const [filtro, setFiltro] = useState<EstadoVerificacion | null>('pendiente');
  const [lista, setLista] = useState<VerificacionAdmin[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const recargar = useCallback(() => {
    listarVerificaciones(filtro)
      .then((datos) => {
        setLista(datos);
        setError(null);
      })
      .catch((e) => {
        setLista([]);
        setError(e instanceof Error ? e.message : 'No se pudo cargar la cola.');
      });
  }, [filtro]);

  useEffect(recargar, [recargar]);

  return (
    <View style={styles.contenedor} testID="panel-verificaciones">
      <Text style={styles.aviso}>
        Revisá que las fotos sean reales y actuales: la foto con el código escrito a mano tiene que mostrar la misma
        prenda. Si dudás, buscá la imagen en Google Lens (si aparece en otra página, no es del vendedor). Plazo: 3
        días hábiles.
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

      {lista === null ? <ActivityIndicator color={Colors.primary} /> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {lista && !error && lista.length === 0 ? <Text style={styles.vacio}>No hay prendas en este estado.</Text> : null}

      {lista?.map((item) => (
        <TarjetaVerificacion key={item.productoId} item={item} onResuelta={recargar} />
      ))}
    </View>
  );
}

function TarjetaVerificacion({ item, onResuelta }: { item: VerificacionAdmin; onResuelta: () => void }) {
  const [motivo, setMotivo] = useState('');
  const [procesando, setProcesando] = useState(false);
  const pendiente = item.estado === 'pendiente' || item.estado === 'requiere_cambios';

  const resolver = async (decision: DecisionVerificacion) => {
    try {
      setProcesando(true);
      await resolverVerificacion(item.productoId, decision, motivo);
      Toast.show({
        type: 'success',
        text1: decision === 'aprobada' ? 'Prenda aprobada' : decision === 'rechazada' ? 'Prenda rechazada' : 'Se pidieron cambios',
      });
      onResuelta();
    } catch (e) {
      Toast.show({ type: 'error', text1: 'No se pudo guardar', text2: e instanceof Error ? e.message : undefined });
    } finally {
      setProcesando(false);
    }
  };

  return (
    <View style={styles.tarjeta} testID={`verificacion-admin-${item.productoId}`}>
      <View style={styles.fila}>
        <Text style={styles.titulo}>{item.nombre}</Text>
        {pendiente ? (
          <Text style={[styles.plazo, item.vencida && styles.vencida]}>{textoPlazo(item.venceAt)}</Text>
        ) : null}
      </View>
      <Text style={styles.muted}>{`Vende: ${item.vendedor ?? '—'} · Código: ${item.codigo ?? '—'}`}</Text>
      {item.descripcion ? <Text style={styles.texto} numberOfLines={4}>{item.descripcion}</Text> : null}

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.fotos}>
        {item.imagenes.map((url) => (
          <Image key={url} source={{ uri: url }} style={styles.foto} accessibilityLabel="Foto de la publicación" />
        ))}
        {item.fotoCodigo ? (
          <View>
            <Image source={{ uri: item.fotoCodigo }} style={[styles.foto, styles.fotoCodigo]} accessibilityLabel="Foto con el código" />
            <Text style={styles.muted}>Con el código</Text>
          </View>
        ) : null}
      </ScrollView>
      {!item.fotoCodigo ? <Text style={styles.vencida}>Todavía no subió la foto con el código.</Text> : null}
      {item.motivo ? <Text style={styles.muted}>{`Último motivo: ${item.motivo}`}</Text> : null}

      {pendiente ? (
        <>
          <TextInput
            value={motivo}
            onChangeText={setMotivo}
            style={styles.input}
            placeholder="Motivo (obligatorio para rechazar o pedir cambios)"
            placeholderTextColor={Colors.textMuted}
          />
          <View style={styles.acciones}>
            <Pressable disabled={procesando} onPress={() => void resolver('aprobada')}>
              <Text style={[styles.link, styles.ok]}>Aprobar</Text>
            </Pressable>
            <Pressable disabled={procesando} onPress={() => void resolver('requiere_cambios')}>
              <Text style={styles.link}>Pedir más fotos</Text>
            </Pressable>
            <Pressable disabled={procesando} onPress={() => void resolver('rechazada')}>
              <Text style={[styles.link, styles.vencida]}>Rechazar</Text>
            </Pressable>
          </View>
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: { gap: Spacing.sm },
  aviso: { color: Colors.textMuted, fontSize: FontSize.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs },
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
  error: { color: Colors.danger },
  vacio: { color: Colors.textMuted },
  tarjeta: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
    gap: Spacing.xs,
  },
  fila: { flexDirection: 'row', justifyContent: 'space-between', gap: Spacing.sm },
  titulo: { flex: 1, color: Colors.text, fontSize: FontSize.lg, fontWeight: '700' },
  plazo: { color: Colors.warning, fontSize: FontSize.sm, fontWeight: '700' },
  vencida: { color: Colors.danger },
  muted: { color: Colors.textMuted, fontSize: FontSize.sm },
  texto: { color: Colors.text, fontSize: FontSize.sm },
  fotos: { gap: Spacing.xs, paddingVertical: Spacing.xs },
  foto: { width: 140, height: 140, borderRadius: Radius.md, backgroundColor: Colors.background },
  fotoCodigo: { borderWidth: 2, borderColor: Colors.warning },
  input: {
    minHeight: 42,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    color: Colors.text,
    paddingHorizontal: Spacing.sm,
  },
  acciones: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.md, marginTop: Spacing.xs },
  link: { color: Colors.secondary, fontWeight: '700', fontSize: FontSize.md },
  ok: { color: Colors.success },
});
