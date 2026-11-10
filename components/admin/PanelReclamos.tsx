import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import Toast from 'react-native-toast-message';

import { ROUTES } from '../../constants/routes';
import { Colors, FontSize, Radius, Spacing } from '../../constants/theme';
import {
  EstadoReclamo,
  MOTIVOS_RECLAMO,
  Reclamo,
  reclamosAdmin,
  resolverReclamo,
} from '../../services/liquidacionesService';

const FILTROS: { valor: EstadoReclamo | null; texto: string }[] = [
  { valor: 'abierto', texto: 'Abiertos' },
  { valor: 'a_favor_comprador', texto: 'A favor del comprador' },
  { valor: 'a_favor_vendedor', texto: 'A favor del vendedor' },
];

/** Reclamos de compradores: se revisa el chat del pedido y se resuelve (genera los cargos al vendedor). */
export function PanelReclamos() {
  const [filtro, setFiltro] = useState<EstadoReclamo | null>('abierto');
  const [lista, setLista] = useState<Reclamo[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const recargar = useCallback(() => {
    reclamosAdmin(filtro)
      .then((datos) => {
        setLista(datos);
        setError(null);
      })
      .catch((e) => {
        setLista([]);
        setError(e instanceof Error ? e.message : 'No se pudieron cargar los reclamos.');
      });
  }, [filtro]);

  useEffect(recargar, [recargar]);

  return (
    <View style={styles.contenedor} testID="panel-reclamos">
      <Text style={styles.muted}>
        Leé el chat del pedido antes de decidir. A favor del comprador: se le cobra al vendedor un 10% del pedido y, si se
        pagó online, el reintegro; se descuenta en su próxima liquidación.
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
      {error ? <Text style={styles.alerta}>{error}</Text> : null}
      {lista && !error && lista.length === 0 ? <Text style={styles.muted}>No hay reclamos en este estado.</Text> : null}
      {lista?.map((reclamo) => (
        <TarjetaReclamo key={reclamo.id} reclamo={reclamo} onResuelto={recargar} />
      ))}
    </View>
  );
}

function TarjetaReclamo({ reclamo, onResuelto }: { reclamo: Reclamo; onResuelto: () => void }) {
  const router = useRouter();
  const [resolucion, setResolucion] = useState('');
  const [procesando, setProcesando] = useState(false);

  const resolver = async (aFavor: 'comprador' | 'vendedor') => {
    try {
      setProcesando(true);
      await resolverReclamo(reclamo.id, aFavor, resolucion);
      Toast.show({ type: 'success', text1: `Reclamo resuelto a favor del ${aFavor}` });
      onResuelto();
    } catch (e) {
      Toast.show({ type: 'error', text1: 'No se pudo resolver', text2: e instanceof Error ? e.message : undefined });
    } finally {
      setProcesando(false);
    }
  };

  return (
    <View style={styles.tarjeta} testID={`reclamo-admin-${reclamo.id}`}>
      <Text style={styles.titulo}>
        {`Pedido #${reclamo.pedidoId} · ${MOTIVOS_RECLAMO.find((m) => m.valor === reclamo.motivo)?.texto ?? reclamo.motivo}`}
      </Text>
      <Text style={styles.muted}>
        {`${reclamo.comprador ?? '—'} reclama a ${reclamo.vendedor ?? '—'} · $${(reclamo.total ?? 0).toLocaleString('es-AR')} · ${
          reclamo.metodoPago ?? ''
        } · ${new Date(reclamo.createdAt).toLocaleDateString('es-AR')}`}
      </Text>
      <Text style={styles.texto}>{reclamo.descripcion}</Text>
      {reclamo.resolucion ? <Text style={styles.muted}>{`Resolución: ${reclamo.resolucion}`}</Text> : null}
      <Pressable
        onPress={() =>
          router.push({ pathname: ROUTES.orderChat, params: { id: String(reclamo.pedidoId), titulo: `Pedido #${reclamo.pedidoId}` } })
        }
      >
        <Text style={styles.link}>Ver chat del pedido</Text>
      </Pressable>
      {reclamo.estado === 'abierto' ? (
        <>
          <TextInput
            value={resolucion}
            onChangeText={setResolucion}
            style={styles.input}
            placeholder="Resolución (la ven el comprador y el vendedor)"
            placeholderTextColor={Colors.textMuted}
            multiline
          />
          <View style={styles.acciones}>
            <Pressable disabled={procesando} onPress={() => void resolver('comprador')}>
              <Text style={[styles.link, styles.alerta]}>A favor del comprador</Text>
            </Pressable>
            <Pressable disabled={procesando} onPress={() => void resolver('vendedor')}>
              <Text style={styles.link}>A favor del vendedor</Text>
            </Pressable>
          </View>
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: { gap: Spacing.sm },
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
  tarjeta: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
    gap: 4,
  },
  titulo: { color: Colors.text, fontWeight: '700', fontSize: FontSize.md },
  texto: { color: Colors.text, fontSize: FontSize.sm },
  muted: { color: Colors.textMuted, fontSize: FontSize.sm },
  alerta: { color: Colors.danger },
  link: { color: Colors.secondary, fontWeight: '700', fontSize: FontSize.md },
  input: {
    minHeight: 60,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    color: Colors.text,
    paddingHorizontal: Spacing.sm,
    textAlignVertical: 'top',
  },
  acciones: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.md },
});
