import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, Share, StyleSheet, Text, TextInput, View } from 'react-native';
import Toast from 'react-native-toast-message';

import { Colors, FontSize, Radius, Spacing } from '../../constants/theme';
import {
  generarLiquidaciones,
  Liquidacion,
  liquidacionesACsv,
  liquidacionesDeLaSemana,
  marcarLiquidacionPagada,
} from '../../services/liquidacionesService';
import { semanaALiquidar, textoSemana } from '../../utils/cbu';

const pesos = (valor: number) => `$${valor.toLocaleString('es-AR', { maximumFractionDigits: 2 })}`;

const TEXTO_ESTADO: Record<Liquidacion['estado'], string> = {
  pendiente: 'A pagar',
  pagada: 'Pagada',
  retenida: 'Retenida',
  saldo_negativo: 'Saldo negativo',
};

/** Liquidaciones semanales: generar la semana, ver a quién pagar y registrar cada transferencia. */
export function PanelLiquidaciones() {
  const [semana, setSemana] = useState(semanaALiquidar());
  const [lista, setLista] = useState<Liquidacion[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [generando, setGenerando] = useState(false);

  const recargar = useCallback(() => {
    liquidacionesDeLaSemana(semana)
      .then((datos) => {
        setLista(datos);
        setError(null);
      })
      .catch((e) => {
        setLista([]);
        setError(e instanceof Error ? e.message : 'No se pudieron cargar las liquidaciones.');
      });
  }, [semana]);

  useEffect(recargar, [recargar]);

  const moverSemana = (dias: number) => {
    const fecha = new Date(`${semana}T12:00:00Z`);
    fecha.setUTCDate(fecha.getUTCDate() + dias);
    setLista(null);
    setSemana(fecha.toISOString().slice(0, 10));
  };

  const onGenerar = async () => {
    try {
      setGenerando(true);
      const creadas = await generarLiquidaciones(semana);
      Toast.show({
        type: 'success',
        text1: creadas > 0 ? `Se generaron ${creadas} liquidación(es)` : 'No había nada nuevo para liquidar',
      });
      recargar();
    } catch (e) {
      Toast.show({ type: 'error', text1: 'No se pudo generar', text2: e instanceof Error ? e.message : undefined });
    } finally {
      setGenerando(false);
    }
  };

  const aPagar = (lista ?? []).filter((l) => l.estado === 'pendiente');
  const total = aPagar.reduce((suma, l) => suma + l.neto, 0);

  return (
    <View style={styles.contenedor} testID="panel-liquidaciones">
      <View style={styles.semana}>
        <Pressable onPress={() => moverSemana(-7)} accessibilityLabel="Semana anterior" hitSlop={8}>
          <Text style={styles.flecha}>‹</Text>
        </Pressable>
        <Text style={styles.titulo}>{`Semana del ${textoSemana(semana)}`}</Text>
        <Pressable onPress={() => moverSemana(7)} accessibilityLabel="Semana siguiente" hitSlop={8}>
          <Text style={styles.flecha}>›</Text>
        </Pressable>
      </View>

      <View style={styles.acciones}>
        <Pressable
          testID="liquidaciones-generar"
          onPress={() => void onGenerar()}
          disabled={generando}
          style={[styles.boton, generando && styles.deshabilitado]}
        >
          <Text style={styles.botonTexto}>{generando ? 'GENERANDO...' : 'GENERAR LIQUIDACIONES'}</Text>
        </Pressable>
        {aPagar.length > 0 ? (
          <Pressable
            onPress={() => void Share.share({ message: liquidacionesACsv(lista ?? []), title: `liquidaciones-${semana}.csv` })}
            style={[styles.boton, styles.botonSecundario]}
          >
            <Text style={[styles.botonTexto, styles.botonTextoSecundario]}>EXPORTAR CSV</Text>
          </Pressable>
        ) : null}
      </View>
      {aPagar.length > 0 ? (
        <Text style={styles.muted}>{`${aPagar.length} transferencia(s) por ${pesos(total)}`}</Text>
      ) : null}

      {lista === null ? <ActivityIndicator color={Colors.primary} /> : null}
      {error ? <Text style={styles.alerta}>{error}</Text> : null}
      {lista && !error && lista.length === 0 ? (
        <Text style={styles.muted}>Todavía no se generó esta semana (o no hubo ventas entregadas).</Text>
      ) : null}

      {lista?.map((l) => (
        <TarjetaLiquidacion key={l.id} liquidacion={l} onPagada={recargar} />
      ))}
    </View>
  );
}

function TarjetaLiquidacion({ liquidacion: l, onPagada }: { liquidacion: Liquidacion; onPagada: () => void }) {
  const [comprobante, setComprobante] = useState('');
  const [guardando, setGuardando] = useState(false);
  const sePuedePagar = l.estado === 'pendiente' || l.estado === 'retenida';

  const onPagar = async () => {
    try {
      setGuardando(true);
      await marcarLiquidacionPagada(l.id, comprobante);
      Toast.show({ type: 'success', text1: `${l.beneficiario}: pagada` });
      onPagada();
    } catch (e) {
      Toast.show({ type: 'error', text1: 'No se pudo marcar', text2: e instanceof Error ? e.message : undefined });
    } finally {
      setGuardando(false);
    }
  };

  return (
    <View style={styles.tarjeta} testID={`liquidacion-admin-${l.id}`}>
      <View style={styles.fila}>
        <Text style={styles.titulo}>{`${l.beneficiario ?? '—'}${l.esEmpresa ? ' (empresa)' : ''}`}</Text>
        <Text style={[styles.estado, l.estado === 'pagada' && styles.ok, l.estado === 'retenida' && styles.alerta]}>
          {TEXTO_ESTADO[l.estado]}
        </Text>
      </View>
      <Text style={styles.texto}>
        {`Ventas ${pesos(l.ventasOnline)} − comisión ${pesos(l.comision + l.comisionEfectivo)} − cargos ${pesos(l.cargos)}${
          l.saldoAnterior < 0 ? ` + saldo ${pesos(l.saldoAnterior)}` : ''
        }`}
      </Text>
      <Text style={styles.neto}>{`Neto: ${pesos(l.neto)}`}</Text>
      {l.cbu ? (
        <Text selectable style={styles.texto}>
          {`${l.titular} · CUIT ${l.cuit}\nCBU ${l.cbu}${l.alias ? ` · alias ${l.alias}` : ''}`}
        </Text>
      ) : null}
      {l.motivoRetencion ? <Text style={styles.alerta}>{l.motivoRetencion}</Text> : null}
      {l.comprobante ? <Text style={styles.muted}>{`Comprobante ${l.comprobante}`}</Text> : null}

      {sePuedePagar ? (
        <View style={styles.pago}>
          <TextInput
            value={comprobante}
            onChangeText={setComprobante}
            style={styles.input}
            placeholder="N.º de comprobante de la transferencia"
            placeholderTextColor={Colors.textMuted}
          />
          <Pressable disabled={guardando} onPress={() => void onPagar()}>
            <Text style={[styles.link, styles.ok]}>{guardando ? '...' : 'Marcar pagada'}</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: { gap: Spacing.sm },
  semana: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  flecha: { color: Colors.secondary, fontSize: 28, paddingHorizontal: Spacing.sm },
  acciones: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  boton: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    minHeight: 40,
    justifyContent: 'center',
  },
  botonSecundario: { backgroundColor: 'transparent', borderWidth: 1, borderColor: Colors.primary },
  deshabilitado: { opacity: 0.5 },
  botonTexto: { color: Colors.background, fontWeight: '700', fontSize: FontSize.sm },
  botonTextoSecundario: { color: Colors.primary },
  tarjeta: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
    gap: 4,
  },
  fila: { flexDirection: 'row', justifyContent: 'space-between', gap: Spacing.sm },
  titulo: { color: Colors.text, fontWeight: '700', fontSize: FontSize.md, flexShrink: 1 },
  estado: { color: Colors.warning, fontWeight: '700', fontSize: FontSize.sm },
  ok: { color: Colors.success },
  alerta: { color: Colors.danger },
  texto: { color: Colors.text, fontSize: FontSize.sm },
  neto: { color: Colors.text, fontWeight: '700', fontSize: FontSize.lg },
  muted: { color: Colors.textMuted, fontSize: FontSize.sm },
  pago: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginTop: Spacing.xs },
  input: {
    flex: 1,
    minHeight: 40,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    color: Colors.text,
    paddingHorizontal: Spacing.sm,
  },
  link: { color: Colors.secondary, fontWeight: '700', fontSize: FontSize.md },
});
