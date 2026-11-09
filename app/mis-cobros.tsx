import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { EncabezadoPantalla } from '../components/ui/EncabezadoPantalla';
import { ROUTES } from '../constants/routes';
import { Colors, FontSize, Radius, Spacing } from '../constants/theme';
import {
  Cargo,
  EstadoLiquidacion,
  Liquidacion,
  misCargosPendientes,
  misLiquidaciones,
  obtenerDatosBancarios,
} from '../services/liquidacionesService';
import { selectEmpresaActiva, useEmpresaStore } from '../stores/useEmpresaStore';
import { useUsuarioStore } from '../stores/useUsuarioStore';
import { enmascararCbu, textoSemana } from '../utils/cbu';

const pesos = (valor: number) => `$${valor.toLocaleString('es-AR', { maximumFractionDigits: 2 })}`;

const TEXTO_ESTADO: Record<EstadoLiquidacion, string> = {
  pendiente: 'A pagar',
  pagada: 'Pagada',
  retenida: 'Retenida',
  saldo_negativo: 'Saldo negativo',
};

/** Liquidaciones semanales del vendedor (o de la empresa activa) y cargos por descontar. */
export default function MisCobrosScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const usuarioId = useUsuarioStore((state) => state.usuario?.id ?? '');
  const empresaActiva = useEmpresaStore(selectEmpresaActiva);
  const empresaId = empresaActiva?.empresaId ?? null;

  const [liquidaciones, setLiquidaciones] = useState<Liquidacion[] | null>(null);
  const [cargos, setCargos] = useState<Cargo[]>([]);
  const [cuenta, setCuenta] = useState<string | null | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      if (!usuarioId) return;
      const cobrador = { empresaId, usuarioId };
      Promise.all([misLiquidaciones(cobrador), misCargosPendientes(cobrador), obtenerDatosBancarios(cobrador)])
        .then(([lista, pendientes, datos]) => {
          setLiquidaciones(lista);
          setCargos(pendientes);
          setCuenta(datos ? `${datos.titular} · ${datos.alias || enmascararCbu(datos.cbu)}` : null);
          setError(null);
        })
        .catch((e) => {
          setLiquidaciones([]);
          setError(e instanceof Error ? e.message : 'No se pudieron cargar tus cobros.');
        });
    }, [empresaId, usuarioId]),
  );

  return (
    <View style={styles.screen}>
      <EncabezadoPantalla titulo="MIS COBROS" />
      <ScrollView contentContainerStyle={[styles.contenido, { paddingBottom: insets.bottom + Spacing.xl }]}>
        <Text style={styles.aviso}>
          Cada lunes New You liquida la semana anterior: lo cobrado con tarjeta y Mercado Pago de los pedidos entregados,
          menos la comisión del 10%, la comisión de las ventas en efectivo y los cargos por reclamos.
        </Text>

        <Pressable style={styles.cuenta} onPress={() => router.push(ROUTES.bankDetails)} accessibilityRole="button">
          <Text style={styles.cuentaTitulo}>Cuenta para cobrar</Text>
          <Text style={[styles.cuentaTexto, cuenta === null && styles.alerta]}>
            {cuenta === undefined ? '…' : cuenta ?? 'Todavía no cargaste tu cuenta: sin ella no podemos pagarte.'}
          </Text>
          <Text style={styles.link}>{cuenta ? 'Cambiar' : 'Cargar datos bancarios'}</Text>
        </Pressable>

        {cargos.length > 0 ? (
          <View style={styles.tarjeta}>
            <Text style={styles.titulo}>Cargos a descontar en la próxima liquidación</Text>
            {cargos.map((cargo) => (
              <View key={cargo.id} style={styles.fila}>
                <Text style={styles.texto}>{cargo.motivo}</Text>
                <Text style={[styles.texto, styles.alerta]}>{`-${pesos(cargo.monto)}`}</Text>
              </View>
            ))}
          </View>
        ) : null}

        {liquidaciones === null ? <ActivityIndicator color={Colors.primary} /> : null}
        {error ? <Text style={styles.alerta}>{error}</Text> : null}
        {liquidaciones && !error && liquidaciones.length === 0 ? (
          <Text style={styles.aviso}>
            Todavía no tenés liquidaciones. Aparecen el lunes siguiente a tu primera venta entregada.
          </Text>
        ) : null}

        {liquidaciones?.map((l) => (
          <View key={l.id} style={styles.tarjeta} testID={`liquidacion-${l.id}`}>
            <View style={styles.fila}>
              <Text style={styles.titulo}>{`Semana del ${textoSemana(l.semanaInicio)}`}</Text>
              <Text
                style={[
                  styles.estado,
                  l.estado === 'pagada' && styles.ok,
                  (l.estado === 'retenida' || l.estado === 'saldo_negativo') && styles.alerta,
                ]}
              >
                {TEXTO_ESTADO[l.estado]}
              </Text>
            </View>
            <Detalle texto={`Ventas cobradas online (${l.pedidos} pedido/s)`} valor={pesos(l.ventasOnline)} />
            <Detalle texto="Comisión New You 10%" valor={`-${pesos(l.comision)}`} />
            {l.comisionEfectivo > 0 ? (
              <Detalle texto="Comisión de ventas en efectivo" valor={`-${pesos(l.comisionEfectivo)}`} />
            ) : null}
            {l.cargos > 0 ? <Detalle texto="Cargos por reclamos" valor={`-${pesos(l.cargos)}`} /> : null}
            {l.saldoAnterior < 0 ? <Detalle texto="Saldo negativo anterior" valor={pesos(l.saldoAnterior)} /> : null}
            <Detalle texto="Neto" valor={pesos(l.neto)} fuerte />
            {l.motivoRetencion ? <Text style={styles.alerta}>{l.motivoRetencion}</Text> : null}
            {l.estado === 'saldo_negativo' ? (
              <Text style={styles.muted}>El saldo negativo se descuenta de tus próximas ventas.</Text>
            ) : null}
            {l.pagadaAt ? (
              <Text style={styles.muted}>
                {`Transferida el ${new Date(l.pagadaAt).toLocaleDateString('es-AR')} a ${enmascararCbu(l.cbu)} · comprobante ${l.comprobante}`}
              </Text>
            ) : null}
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

function Detalle({ texto, valor, fuerte }: { texto: string; valor: string; fuerte?: boolean }) {
  return (
    <View style={styles.fila}>
      <Text style={[styles.texto, fuerte && styles.fuerte]}>{texto}</Text>
      <Text style={[styles.texto, fuerte && styles.fuerte]}>{valor}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  contenido: { width: '100%', maxWidth: 700, alignSelf: 'center', padding: Spacing.md, gap: Spacing.md },
  aviso: { color: Colors.textMuted, fontSize: FontSize.sm },
  cuenta: { backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: Spacing.md, gap: 4 },
  cuentaTitulo: { color: Colors.text, fontWeight: '700', fontSize: FontSize.md },
  cuentaTexto: { color: Colors.text, fontSize: FontSize.md },
  link: { color: Colors.secondary, fontWeight: '700', fontSize: FontSize.sm },
  tarjeta: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
    gap: 6,
  },
  fila: { flexDirection: 'row', justifyContent: 'space-between', gap: Spacing.sm },
  titulo: { color: Colors.text, fontWeight: '700', fontSize: FontSize.md, flexShrink: 1 },
  estado: { color: Colors.warning, fontWeight: '700', fontSize: FontSize.sm },
  ok: { color: Colors.success },
  alerta: { color: Colors.danger },
  texto: { color: Colors.text, fontSize: FontSize.sm, flexShrink: 1 },
  fuerte: { fontWeight: '700', fontSize: FontSize.md },
  muted: { color: Colors.textMuted, fontSize: FontSize.xs },
});
