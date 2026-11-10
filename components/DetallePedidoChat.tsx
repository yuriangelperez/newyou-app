import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { ROUTES } from '../constants/routes';
import { Colors, FontSize, Radius, Spacing } from '../constants/theme';
import { obtenerPedido, Pedido, TEXTO_ESTADO } from '../services/pedidosService';

const pesos = (valor: number) => `$${valor.toLocaleString('es-AR')}`;

/** Resumen del pedido arriba del chat: qué se compró, estado, entrega y total. Se despliega al tocarlo. */
export function DetallePedidoChat({ pedidoId }: { pedidoId: number }) {
  const router = useRouter();
  const [pedido, setPedido] = useState<Pedido | null>(null);
  const [abierto, setAbierto] = useState(false);

  useEffect(() => {
    let vigente = true;
    obtenerPedido(pedidoId)
      .then((datos) => vigente && setPedido(datos))
      .catch(() => undefined);
    return () => {
      vigente = false;
    };
  }, [pedidoId]);

  if (!pedido) {
    return null;
  }

  const unidades = pedido.items.reduce((suma, item) => suma + item.cantidad, 0);
  const resumen = pedido.items.map((item) => `${item.cantidad} × ${item.nombre}`).join(', ');

  return (
    <View style={styles.tarjeta} testID="chat-detalle-pedido">
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={abierto ? 'Ocultar detalle del pedido' : 'Ver detalle del pedido'}
        onPress={() => setAbierto((valor) => !valor)}
        style={styles.encabezado}
      >
        {pedido.items[0]?.imagen ? <Image source={{ uri: pedido.items[0].imagen }} style={styles.miniatura} /> : null}
        <View style={styles.resumen}>
          <Text style={styles.titulo}>{`Pedido #${pedido.id} · ${TEXTO_ESTADO[pedido.estado]}`}</Text>
          <Text style={styles.texto} numberOfLines={abierto ? undefined : 1}>
            {`${unidades} prenda(s) · ${pesos(pedido.total)} · ${resumen}`}
          </Text>
        </View>
        <Ionicons name={abierto ? 'chevron-up' : 'chevron-down'} size={20} color={Colors.textMuted} />
      </Pressable>

      {abierto ? (
        <View style={styles.detalle}>
          {pedido.items.map((item, index) => (
            <Pressable
              key={`${item.productoId ?? 'x'}-${index}`}
              style={styles.item}
              disabled={!item.productoId}
              onPress={() =>
                item.productoId &&
                router.push({ pathname: ROUTES.productDetail, params: { id: String(item.productoId) } })
              }
            >
              {item.imagen ? <Image source={{ uri: item.imagen }} style={styles.imagen} /> : <View style={styles.imagen} />}
              <View style={styles.resumen}>
                <Text style={styles.nombre}>{item.nombre}</Text>
                <Text style={styles.muted}>
                  {[item.talle && `Talle ${item.talle}`, item.color, `x${item.cantidad}`].filter(Boolean).join(' · ')}
                </Text>
              </View>
              <Text style={styles.nombre}>{pesos(item.precio * item.cantidad)}</Text>
            </Pressable>
          ))}
          <Text style={styles.muted}>
            {pedido.entrega === 'local'
              ? 'Retiro en persona'
              : `Envío a ${pedido.direccionEntrega ?? 'domicilio'}${
                  pedido.empresaEnvio ? ` · ${pedido.empresaEnvio}${pedido.codigoSeguimiento ? ` ${pedido.codigoSeguimiento}` : ''}` : ''
                }`}
          </Text>
          <Text style={styles.muted}>{`Pago: ${pedido.metodoPago} · Comprador: ${pedido.comprador ?? '—'} · Vendedor: ${
            pedido.vendedor ?? '—'
          }`}</Text>
          <Text style={styles.total}>{`Total ${pesos(pedido.total)}${pedido.envio > 0 ? ` (envío ${pesos(pedido.envio)})` : ''}`}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  tarjeta: {
    width: '100%',
    maxWidth: 800,
    alignSelf: 'center',
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.surface,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  encabezado: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  miniatura: { width: 40, height: 40, borderRadius: Radius.sm },
  resumen: { flex: 1, gap: 2 },
  titulo: { color: Colors.text, fontWeight: '700', fontSize: FontSize.md },
  texto: { color: Colors.text, fontSize: FontSize.sm },
  detalle: { marginTop: Spacing.sm, gap: Spacing.xs },
  item: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  imagen: { width: 48, height: 48, borderRadius: Radius.sm, backgroundColor: Colors.background },
  nombre: { color: Colors.text, fontSize: FontSize.sm, fontWeight: '600' },
  muted: { color: Colors.textMuted, fontSize: FontSize.sm },
  total: { color: Colors.text, fontWeight: '700', fontSize: FontSize.md },
});
