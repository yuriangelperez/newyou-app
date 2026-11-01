import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { CalendarioRango } from "../components/ui/CalendarioRango";
import { EncabezadoPantalla } from "../components/ui/EncabezadoPantalla";
import { estilosFormulario as styles } from "../constants/estilosFormulario";
import { Colors, FontSize, Radius, Spacing } from "../constants/theme";
import { MetricasVentas, obtenerMetricasRango } from "../services/pedidosService";
import { puede, selectEmpresaActiva, useEmpresaStore } from "../stores/useEmpresaStore";
import {
  agrupacionDelPeriodo,
  agruparIngresos,
  AgrupacionIngresos,
  barrasPorHora,
  diasDelRango,
  etiquetaRango,
  fechaArgentina,
  fechaISO,
  PeriodoMetricas,
  RangoFechas,
  rangoPredefinido,
  validarRango,
} from "../utils/rangoFechas";

const PERIODOS: { id: PeriodoMetricas; texto: string }[] = [
  { id: "hoy", texto: "Hoy" },
  { id: "semana", texto: "Esta semana" },
  { id: "mes", texto: "Este mes" },
  { id: "anio", texto: "Este año" },
  { id: "personalizado", texto: "Personalizado" },
];

const formatPrecio = (valor: number) => `$${Math.round(valor).toLocaleString("es-AR")}`;

const LEYENDAS: Record<AgrupacionIngresos, string> = {
  hora: "Ingresos por hora",
  dia: "Ingresos por día",
  semana: "Ingresos por semana (de lunes a domingo)",
  mes: "Ingresos por mes",
};

/** Ingresos como barras; cómo se dividen depende del período (hoy por hora, semana por día, mes por semana, año por mes). */
function GraficoIngresos({
  metricas,
  agrupacion,
}: {
  metricas: MetricasVentas;
  agrupacion: AgrupacionIngresos;
}) {
  // Sin la migración 20 no hay datos por hora: se muestra el día completo en una sola barra.
  const sinHoras = agrupacion === "hora" && metricas.porHora.length === 0;
  const modo = sinHoras ? "dia" : agrupacion;
  const barras = useMemo(
    () => (modo === "hora" ? barrasPorHora(metricas.porHora) : agruparIngresos(metricas.porDia, modo)),
    [metricas.porDia, metricas.porHora, modo],
  );
  const mayor = Math.max(...barras.map((b) => b.ingresos), 0);
  const maximo = mayor || 1;
  const cadaCuanto = modo === "hora" ? 3 : Math.ceil(barras.length / 6);

  return (
    <View style={grafico.wrapper}>
      <Text style={grafico.maximo}>{mayor > 0 ? `Máximo: ${formatPrecio(mayor)}` : "Sin ventas en el período"}</Text>
      <View style={grafico.area}>
        {barras.map((barra, i) => (
          <View key={`${barra.etiqueta}-${i}`} style={grafico.columna}>
            <View
              accessibilityLabel={`${barra.etiqueta}: ${formatPrecio(barra.ingresos)}`}
              style={[grafico.barra, { height: `${(barra.ingresos / maximo) * 100}%` }]}
            />
          </View>
        ))}
      </View>
      <View style={grafico.ejeX}>
        {barras.map((barra, i) => (
          <Text key={`${barra.etiqueta}-${i}`} style={grafico.etiqueta} numberOfLines={1}>
            {i % cadaCuanto === 0 ? barra.etiqueta : ""}
          </Text>
        ))}
      </View>
      <Text style={grafico.leyenda}>
        {sinHoras ? "Para ver las horas falta correr la migración 20-metricas-por-hora.sql." : LEYENDAS[modo]}
      </Text>
    </View>
  );
}

export default function MetricasScreen() {
  const insets = useSafeAreaInsets();
  const empresaActiva = useEmpresaStore(selectEmpresaActiva);
  const empresaId = empresaActiva?.empresaId ?? null;
  const [periodo, setPeriodo] = useState<PeriodoMetricas>("mes");
  // Rango personalizado: se elige en el calendario y se aplica con el botón (no en cada clic).
  const [rangoPersonalizado, setRangoPersonalizado] = useState<RangoFechas>(() => rangoPredefinido("mes"));
  const [desdeElegido, setDesdeElegido] = useState(() => rangoPredefinido("mes").desde);
  const [hastaElegido, setHastaElegido] = useState(() => rangoPredefinido("mes").hasta);
  // Qué extremo se está eligiendo en el calendario (null = calendario cerrado).
  const [eligiendo, setEligiendo] = useState<"desde" | "hasta" | null>(null);
  const [errorRango, setErrorRango] = useState<string | null>(null);
  const [metricas, setMetricas] = useState<MetricasVentas | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const sinPermiso = empresaActiva !== null && !puede(empresaActiva, "metricas.ver");
  const rango = useMemo(
    () => (periodo === "personalizado" ? rangoPersonalizado : rangoPredefinido(periodo)),
    [periodo, rangoPersonalizado],
  );

  const elegirDia = (iso: string) => {
    if (eligiendo === "desde") {
      setDesdeElegido(iso);
      if (iso > hastaElegido) setHastaElegido(iso);
      setEligiendo("hasta"); // sigue con el "hasta" para elegir el rango con dos clics
    } else {
      if (iso < desdeElegido) setDesdeElegido(iso);
      setHastaElegido(iso);
      setEligiendo(null);
    }
  };

  const aplicarRango = () => {
    const resultado = validarRango(fechaArgentina(desdeElegido), fechaArgentina(hastaElegido));
    if (!resultado.ok) {
      setErrorRango(resultado.mensaje);
      return;
    }
    setErrorRango(null);
    setRangoPersonalizado({ desde: resultado.desde, hasta: resultado.hasta });
  };

  useFocusEffect(
    useCallback(() => {
      if (sinPermiso) return;
      let vigente = true;
      setCargando(true);
      obtenerMetricasRango(empresaId, { desde: rango.desde, hasta: rango.hasta }, fechaISO(new Date()))
        .then((datos) => vigente && (setMetricas(datos), setError(null)))
        .catch((err) => vigente && setError(err instanceof Error ? err.message : "No se pudieron cargar las métricas."))
        .finally(() => vigente && setCargando(false));
      return () => {
        vigente = false;
      };
    }, [empresaId, rango.desde, rango.hasta, sinPermiso]),
  );

  const ticket = metricas && metricas.pedidos > 0 ? metricas.ingresos / metricas.pedidos : 0;

  return (
    <View style={styles.screen}>
      <EncabezadoPantalla titulo={empresaActiva ? `MÉTRICAS · ${empresaActiva.nombre.toUpperCase()}` : "MIS MÉTRICAS"} />
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + Spacing.xl }]}>
        {sinPermiso ? <Text style={styles.empty}>Tu rol en la empresa no puede ver las métricas.</Text> : null}

        <View style={styles.chips}>
          {PERIODOS.map((opcion) => {
            const activo = periodo === opcion.id;
            return (
              <Pressable
                key={opcion.id}
                testID={`metricas-periodo-${opcion.id}`}
                accessibilityRole="button"
                accessibilityState={{ selected: activo }}
                onPress={() => setPeriodo(opcion.id)}
                style={[styles.chip, activo && styles.chipActivo]}
              >
                <Text style={[styles.chipTexto, activo && styles.chipTextoActivo]}>{opcion.texto}</Text>
              </Pressable>
            );
          })}
        </View>

        {periodo === "personalizado" ? (
          <View style={styles.card}>
            <View style={local.fechas}>
              {(["desde", "hasta"] as const).map((extremo) => {
                const activo = eligiendo === extremo;
                return (
                  <View key={extremo} style={local.fecha}>
                    <Text style={styles.label}>{extremo === "desde" ? "Desde" : "Hasta"}</Text>
                    <Pressable
                      testID={`metricas-${extremo}`}
                      accessibilityRole="button"
                      accessibilityLabel={`Elegir fecha ${extremo}`}
                      onPress={() => setEligiendo(activo ? null : extremo)}
                      style={[styles.input, local.campoFecha, activo && local.campoFechaActivo]}
                    >
                      <Text style={local.campoFechaTexto}>
                        {fechaArgentina(extremo === "desde" ? desdeElegido : hastaElegido)}
                      </Text>
                      <Ionicons name="calendar-outline" size={18} color={Colors.primary} />
                    </Pressable>
                  </View>
                );
              })}
            </View>
            {eligiendo ? (
              <CalendarioRango
                desde={desdeElegido}
                hasta={hastaElegido}
                maximo={fechaISO(new Date())}
                onElegir={elegirDia}
              />
            ) : null}
            {errorRango ? <Text style={styles.error}>{errorRango}</Text> : null}
            <Pressable testID="metricas-aplicar" accessibilityRole="button" onPress={aplicarRango} style={styles.saveButton}>
              <Text style={styles.saveText}>Ver rango</Text>
            </Pressable>
          </View>
        ) : null}

        <Text style={styles.muted} testID="metricas-rango">{`Período: ${etiquetaRango(rango)}`}</Text>

        {cargando && !sinPermiso ? <ActivityIndicator color={Colors.primary} /> : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}

        {metricas && !sinPermiso ? (
          <>
            <View style={local.kpis}>
              {[
                { titulo: "Ingresos", valor: formatPrecio(metricas.ingresos) },
                { titulo: "Pedidos", valor: String(metricas.pedidos) },
                { titulo: "Unidades", valor: String(metricas.unidades) },
                { titulo: "Ticket promedio", valor: formatPrecio(ticket) },
              ].map((kpi) => (
                <View key={kpi.titulo} style={local.kpi}>
                  <Text style={local.kpiValor}>{kpi.valor}</Text>
                  <Text style={styles.muted}>{kpi.titulo}</Text>
                </View>
              ))}
            </View>
            <Text style={styles.muted}>
              {`${metricas.entregados} entregados · ${metricas.enCurso} en curso · ${metricas.cancelados} cancelados (no suman a los ingresos)`}
            </Text>

            <View style={styles.card}>
              <GraficoIngresos metricas={metricas} agrupacion={agrupacionDelPeriodo(periodo, diasDelRango(rango))} />
            </View>

            <Text style={styles.sectionTitle}>Más vendidos</Text>
            <View style={styles.card}>
              {metricas.topProductos.length === 0 ? <Text style={styles.empty}>Sin ventas en el período.</Text> : null}
              {metricas.topProductos.map((producto, i) => (
                <View key={producto.nombre} style={styles.cardRow}>
                  <Text style={styles.cardText}>{`${i + 1}. ${producto.nombre}`}</Text>
                  <Text style={styles.muted}>{`${producto.unidades} u · ${formatPrecio(producto.ingresos)}`}</Text>
                </View>
              ))}
            </View>

            {empresaActiva && metricas.porSede.length > 0 ? (
              <>
                <Text style={styles.sectionTitle}>Por sede</Text>
                <View style={styles.card}>
                  {metricas.porSede.map((sede) => (
                    <View key={sede.sede} style={styles.cardRow}>
                      <Text style={styles.cardText}>{sede.sede}</Text>
                      <Text style={styles.muted}>{`${sede.pedidos} pedidos · ${formatPrecio(sede.ingresos)}`}</Text>
                    </View>
                  ))}
                </View>
              </>
            ) : null}

            <Text style={styles.sectionTitle}>Stock bajo (2 o menos)</Text>
            <View style={styles.card}>
              {metricas.stockBajo.length === 0 ? <Text style={styles.empty}>Todo con stock.</Text> : null}
              {metricas.stockBajo.map((producto) => (
                <View key={producto.id} style={styles.cardRow}>
                  <Text style={styles.cardText}>{producto.nombre}</Text>
                  <Text style={[styles.badge, producto.stock === 0 && styles.danger]}>
                    {producto.stock === 0 ? "Sin stock" : `${producto.stock} u`}
                  </Text>
                </View>
              ))}
            </View>
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}

const local = StyleSheet.create({
  fechas: { flexDirection: "row", gap: Spacing.sm },
  fecha: { flex: 1, gap: Spacing.xs },
  campoFecha: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  campoFechaActivo: { borderColor: Colors.secondary, borderWidth: 2 },
  campoFechaTexto: { color: Colors.text, fontSize: FontSize.md, fontFamily: "Montserrat_400Regular" },
  kpis: { flexDirection: "row", flexWrap: "wrap", gap: Spacing.sm },
  kpi: {
    flexGrow: 1,
    flexBasis: "45%",
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.secondary,
    borderRadius: Radius.md,
    padding: Spacing.md,
  },
  kpiValor: { color: Colors.primary, fontSize: FontSize.xl, fontFamily: "Montserrat_700Bold" },
});

const grafico = StyleSheet.create({
  wrapper: { rowGap: Spacing.xs },
  maximo: { color: Colors.textMuted, fontSize: FontSize.xs, fontFamily: "Montserrat_500Medium" },
  area: {
    height: 140,
    flexDirection: "row",
    alignItems: "flex-end",
    columnGap: 2,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  columna: { flex: 1, height: "100%", justifyContent: "flex-end" },
  barra: { backgroundColor: Colors.secondary, borderTopLeftRadius: 2, borderTopRightRadius: 2, minHeight: 1 },
  ejeX: { flexDirection: "row", columnGap: 2 },
  etiqueta: { flex: 1, color: Colors.textMuted, fontSize: 9, fontFamily: "Montserrat_500Medium", overflow: "visible" },
  leyenda: { color: Colors.textMuted, fontSize: FontSize.sm, fontFamily: "Montserrat_500Medium" },
});
