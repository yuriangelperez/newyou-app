import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { EncabezadoPantalla } from '../components/ui/EncabezadoPantalla';
import { Colors, FontSize, Radius, Spacing } from '../constants/theme';
import {
  Aviso,
  contextoAviso,
  destinoAviso,
  escucharAvisos,
  listarAvisos,
  marcarAvisosLeidos,
} from '../services/avisosService';
import { useUsuarioStore } from '../stores/useUsuarioStore';

const ICONO: Record<string, keyof typeof Ionicons.glyphMap> = {
  chat: 'chatbubbles-outline',
  pregunta: 'help-circle-outline',
  respuesta: 'chatbox-ellipses-outline',
  venta: 'bag-check-outline',
  compra: 'cube-outline',
  verificacion: 'shield-checkmark-outline',
  liquidacion: 'cash-outline',
};

function cuando(iso: string) {
  const minutos = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (minutos < 1) return 'recién';
  if (minutos < 60) return `hace ${minutos} min`;
  if (minutos < 24 * 60) return `hace ${Math.round(minutos / 60)} h`;
  return new Date(iso).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' });
}

/** Panel de notificaciones: mensajes del chat, preguntas, ventas, estados de pedidos, etc. */
export default function NotificacionesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const usuarioId = useUsuarioStore((state) => state.usuario?.id ?? '');
  const [avisos, setAvisos] = useState<Aviso[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const recargar = useCallback(() => {
    listarAvisos()
      .then((lista) => {
        setAvisos(lista);
        setError(null);
      })
      .catch((e) => {
        setAvisos((actuales) => actuales ?? []);
        setError(e instanceof Error ? e.message : 'No se pudieron cargar las notificaciones.');
      });
  }, []);

  useFocusEffect(recargar);

  useEffect(() => {
    if (!usuarioId) return;
    return escucharAvisos(usuarioId, recargar);
  }, [usuarioId, recargar]);

  const abrir = (aviso: Aviso) => {
    if (!aviso.leida) {
      setAvisos((actuales) => actuales?.map((a) => (a.id === aviso.id ? { ...a, leida: true } : a)) ?? null);
      void marcarAvisosLeidos([aviso.id]).catch(() => undefined);
    }
    const destino = destinoAviso(aviso.datos);
    if (destino) {
      router.push(destino as Parameters<typeof router.push>[0]);
    }
  };

  const marcarTodas = () => {
    setAvisos((actuales) => actuales?.map((a) => ({ ...a, leida: true })) ?? null);
    void marcarAvisosLeidos().catch(() => undefined);
  };

  const hayNoLeidas = (avisos ?? []).some((a) => !a.leida);

  const renderAviso = ({ item }: { item: Aviso }) => {
    const contexto = contextoAviso(item);
    const esPregunta = item.datos.tipo === 'pregunta' || item.datos.tipo === 'respuesta';
    return (
      <Pressable
        testID={`aviso-${item.id}`}
        accessibilityRole="button"
        onPress={() => abrir(item)}
        style={[styles.aviso, !item.leida && styles.avisoNuevo]}
      >
        {item.datos.imagen ? (
          <Image source={{ uri: item.datos.imagen }} style={styles.imagen} />
        ) : (
          <View style={[styles.imagen, styles.icono]}>
            <Ionicons name={ICONO[item.datos.tipo ?? ''] ?? 'notifications-outline'} size={22} color={Colors.secondary} />
          </View>
        )}
        <View style={styles.cuerpo}>
          <View style={styles.fila}>
            <Text style={[styles.titulo, !item.leida && styles.tituloNuevo]} numberOfLines={2}>
              {item.titulo}
            </Text>
            <Text style={styles.hora}>{cuando(item.createdAt)}</Text>
          </View>
          {!esPregunta && item.cuerpo ? (
            <Text style={styles.texto} numberOfLines={3}>
              {item.cuerpo}
            </Text>
          ) : null}
          {contexto ? (
            <Text style={esPregunta ? styles.texto : styles.contexto} numberOfLines={esPregunta ? 6 : 2}>
              {contexto}
            </Text>
          ) : null}
        </View>
        {!item.leida ? <View style={styles.punto} /> : null}
      </Pressable>
    );
  };

  return (
    <View style={styles.screen}>
      <EncabezadoPantalla titulo="NOTIFICACIONES" />
      {hayNoLeidas ? (
        <Pressable onPress={marcarTodas} style={styles.marcarTodas} testID="avisos-marcar-todas">
          <Text style={styles.link}>Marcar todas como leídas</Text>
        </Pressable>
      ) : null}
      {avisos === null ? (
        <ActivityIndicator color={Colors.secondary} style={styles.cargando} />
      ) : (
        <FlatList
          data={avisos}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderAviso}
          contentContainerStyle={[styles.lista, { paddingBottom: insets.bottom + Spacing.xl }]}
          ListHeaderComponent={error ? <Text style={styles.error}>{error}</Text> : null}
          ListEmptyComponent={
            <Text style={styles.vacio}>
              Todavía no tenés notificaciones. Acá vas a ver los mensajes de tus pedidos, las preguntas sobre tus
              prendas y los cambios de estado.
            </Text>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  cargando: { marginTop: Spacing.xl },
  lista: { width: '100%', maxWidth: 700, alignSelf: 'center', padding: Spacing.md, gap: Spacing.sm },
  marcarTodas: { alignSelf: 'flex-end', paddingHorizontal: Spacing.md, paddingTop: Spacing.sm },
  link: { color: Colors.secondary, fontWeight: '700', fontSize: FontSize.sm },
  aviso: {
    flexDirection: 'row',
    gap: Spacing.sm,
    padding: Spacing.sm,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.background,
  },
  avisoNuevo: { backgroundColor: Colors.surface, borderColor: Colors.secondary },
  imagen: { width: 48, height: 48, borderRadius: Radius.md, backgroundColor: Colors.surface },
  icono: { alignItems: 'center', justifyContent: 'center' },
  cuerpo: { flex: 1, gap: 2 },
  fila: { flexDirection: 'row', justifyContent: 'space-between', gap: Spacing.sm },
  titulo: { flex: 1, color: Colors.text, fontSize: FontSize.md, fontWeight: '600' },
  tituloNuevo: { fontWeight: '800' },
  hora: { color: Colors.textMuted, fontSize: FontSize.xs },
  texto: { color: Colors.text, fontSize: FontSize.sm },
  contexto: { color: Colors.textMuted, fontSize: FontSize.sm },
  punto: { width: 10, height: 10, borderRadius: 5, backgroundColor: Colors.secondary, alignSelf: 'center' },
  error: { color: Colors.danger, marginBottom: Spacing.sm },
  vacio: { color: Colors.textMuted, fontSize: FontSize.md, textAlign: 'center', marginTop: Spacing.xl },
});
