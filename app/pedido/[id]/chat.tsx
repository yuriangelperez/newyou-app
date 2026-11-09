import { useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { EncabezadoPantalla } from '../../../components/ui/EncabezadoPantalla';
import { Colors, FontSize, Radius, Spacing } from '../../../constants/theme';
import {
  agregarMensaje,
  chatAbierto,
  enviarMensaje,
  escucharMensajes,
  listarMensajes,
  marcarChatLeido,
  MensajePedido,
} from '../../../services/chatService';
import { useUsuarioStore } from '../../../stores/useUsuarioStore';
import { AVISO_DATOS_CONTACTO, contieneDatosContacto } from '../../../utils/contacto';

const hora = (iso: string) =>
  new Date(iso).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

/** Chat del pedido entre comprador y vendedor, en tiempo real (Supabase Realtime). */
export default function ChatPedidoScreen() {
  const { id, titulo } = useLocalSearchParams<{ id: string; titulo?: string }>();
  const pedidoId = Number(id);
  const insets = useSafeAreaInsets();
  const miId = useUsuarioStore((state) => state.usuario?.id ?? null);
  const lista = useRef<FlatList<MensajePedido>>(null);

  const [mensajes, setMensajes] = useState<MensajePedido[] | null>(null);
  const [abierto, setAbierto] = useState(true);
  const [texto, setTexto] = useState('');
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    if (!pedidoId) {
      return;
    }
    let vigente = true;
    listarMensajes(pedidoId)
      .then((datos) => vigente && setMensajes(datos))
      .catch((e) => {
        if (vigente) {
          setMensajes([]);
          setError(e instanceof Error ? e.message : 'No se pudo cargar el chat.');
        }
      });
    chatAbierto(pedidoId)
      .then((valor) => vigente && setAbierto(valor))
      .catch(() => undefined);
    void marcarChatLeido(pedidoId);

    const dejarDeEscuchar = escucharMensajes(pedidoId, (mensaje) => {
      setMensajes((actuales) => agregarMensaje(actuales ?? [], mensaje));
      void marcarChatLeido(pedidoId);
    });
    return () => {
      vigente = false;
      dejarDeEscuchar();
    };
  }, [pedidoId]);

  const onEnviar = async () => {
    const limpio = texto.trim();
    if (!limpio || enviando) {
      return;
    }
    if (contieneDatosContacto(limpio)) {
      setError(AVISO_DATOS_CONTACTO);
      return;
    }
    try {
      setEnviando(true);
      const nuevo = await enviarMensaje(pedidoId, limpio);
      setMensajes((actuales) => agregarMensaje(actuales ?? [], nuevo));
      setTexto('');
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo enviar el mensaje.');
    } finally {
      setEnviando(false);
    }
  };

  const renderMensaje = ({ item }: { item: MensajePedido }) => {
    if (item.sistema) {
      return (
        <Text style={styles.sistema} testID={`mensaje-${item.id}`}>
          {item.texto}
        </Text>
      );
    }
    const mio = item.autorId === miId;
    return (
      <View style={[styles.burbuja, mio ? styles.burbujaMia : styles.burbujaOtro]} testID={`mensaje-${item.id}`}>
        <Text style={[styles.texto, mio && styles.textoMio]}>{item.texto}</Text>
        <Text style={[styles.hora, mio && styles.textoMio]}>{hora(item.createdAt)}</Text>
      </View>
    );
  };

  return (
    <View style={styles.screen}>
      <EncabezadoPantalla titulo={titulo ? String(titulo) : `Pedido #${id}`} />
      <KeyboardAvoidingView behavior="padding" style={styles.screen}>
        {mensajes === null ? (
          <ActivityIndicator color={Colors.secondary} style={styles.cargando} />
        ) : (
          <FlatList
            ref={lista}
            data={mensajes}
            keyExtractor={(item) => String(item.id)}
            renderItem={renderMensaje}
            contentContainerStyle={styles.lista}
            onContentSizeChange={() => lista.current?.scrollToEnd({ animated: false })}
            ListEmptyComponent={
              <Text style={styles.vacio}>Todavía no hay mensajes. Usá este chat para coordinar la entrega.</Text>
            }
          />
        )}

        <View style={[styles.pie, { paddingBottom: insets.bottom + Spacing.sm }]}>
          {error ? <Text style={styles.error}>{error}</Text> : null}
          {abierto ? (
            <View style={styles.fila}>
              <TextInput
                testID="chat-input"
                style={styles.input}
                value={texto}
                onChangeText={(valor) => {
                  setTexto(valor);
                  setError('');
                }}
                placeholder="Escribí un mensaje"
                placeholderTextColor={Colors.textMuted}
                maxLength={1000}
                multiline
              />
              <Pressable
                testID="chat-enviar"
                accessibilityRole="button"
                accessibilityLabel="Enviar mensaje"
                onPress={() => void onEnviar()}
                disabled={enviando || !texto.trim()}
                style={[styles.boton, (enviando || !texto.trim()) && styles.botonDeshabilitado]}
              >
                <Text style={styles.botonTexto}>{enviando ? '...' : 'ENVIAR'}</Text>
              </Pressable>
            </View>
          ) : (
            <Text style={styles.cerrado}>Este chat se cerró: pasaron 30 días desde que terminó el pedido.</Text>
          )}
          <Text style={styles.ayuda}>No compartas teléfonos, mails ni links: toda la compra queda protegida dentro de New You.</Text>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  cargando: { marginTop: Spacing.xl },
  lista: { padding: Spacing.md, gap: Spacing.sm, width: '100%', maxWidth: 800, alignSelf: 'center' },
  vacio: { color: Colors.textMuted, textAlign: 'center', marginTop: Spacing.xl },
  sistema: {
    alignSelf: 'center',
    color: Colors.textMuted,
    fontSize: FontSize.xs,
    textAlign: 'center',
    paddingHorizontal: Spacing.md,
  },
  burbuja: { maxWidth: '80%', borderRadius: Radius.lg, paddingHorizontal: Spacing.sm, paddingVertical: Spacing.xs },
  burbujaMia: { alignSelf: 'flex-end', backgroundColor: Colors.primary },
  burbujaOtro: { alignSelf: 'flex-start', backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border },
  texto: { color: Colors.text, fontSize: FontSize.md },
  textoMio: { color: Colors.background },
  hora: { color: Colors.textMuted, fontSize: 10, marginTop: 2, alignSelf: 'flex-end' },
  pie: {
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    backgroundColor: Colors.surface,
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
    gap: Spacing.xs,
  },
  fila: { flexDirection: 'row', alignItems: 'flex-end', gap: Spacing.sm },
  input: {
    flex: 1,
    minHeight: 42,
    maxHeight: 120,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    color: Colors.text,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    fontSize: FontSize.md,
  },
  boton: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.md,
    minHeight: 42,
    paddingHorizontal: Spacing.md,
    justifyContent: 'center',
  },
  botonDeshabilitado: { opacity: 0.5 },
  botonTexto: { color: Colors.background, fontFamily: 'Montserrat_700Bold', fontSize: FontSize.sm },
  error: { color: Colors.danger, fontSize: FontSize.sm },
  cerrado: { color: Colors.textMuted, fontSize: FontSize.sm },
  ayuda: { color: Colors.textMuted, fontSize: 10 },
});
