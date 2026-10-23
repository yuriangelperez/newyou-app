import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { ActivityIndicator, FlatList, Text, useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import TarjetaProducto from "../../components/TarjetaProducto";
import { EncabezadoPantalla } from "../../components/ui/EncabezadoPantalla";
import { Estrellas, ResumenReputacion } from "../../components/ui/Estrellas";
import { VerEnMapa } from "../../components/ui/VerEnMapa";
import { ROUTES } from "../../constants/routes";
import { estilosFormulario as styles } from "../../constants/estilosFormulario";
import { Colors, Spacing } from "../../constants/theme";
import { Empresa, listarSedes, obtenerEmpresaPorSlug, Sede } from "../../services/empresasService";
import { getProductosDeEmpresa } from "../../services/productosService";
import { obtenerReputacion, Reputacion } from "../../services/pedidosService";
import { useCarritoStore } from "../../stores/useCarritoStore";
import { Producto } from "../../types";

const GAP = 16;

/** Página pública de una tienda: datos, sedes y sólo las publicaciones de esa empresa. */
export default function TiendaScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const agregarProducto = useCarritoStore((state) => state.agregarProducto);
  const [empresa, setEmpresa] = useState<Empresa | null>(null);
  const [sedes, setSedes] = useState<Sede[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [reputacion, setReputacion] = useState<Reputacion | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const ancho = Math.min(width, 800);
  const columnas = ancho >= 640 ? 3 : 2;
  const cardWidth = Math.max(Math.floor((ancho - Spacing.md * 2 - (columnas - 1) * GAP) / columnas), 150);

  useFocusEffect(
    useCallback(() => {
      if (!slug) return;
      setError(null);
      obtenerEmpresaPorSlug(slug)
        .then(async (datos) => {
          setEmpresa(datos);
          if (!datos) return;
          const [sedesEmpresa, publicaciones, opiniones] = await Promise.all([
            listarSedes(datos.id),
            getProductosDeEmpresa(datos.id),
            obtenerReputacion({ empresaId: datos.id }),
          ]);
          setSedes(sedesEmpresa.filter((sede) => sede.activa));
          setProductos(publicaciones);
          setReputacion(opiniones);
        })
        .catch((err) => setError(err instanceof Error ? err.message : "No se pudo cargar la tienda."))
        .finally(() => setCargando(false));
    }, [slug]),
  );

  const onPressAgregar = (producto: Producto) => {
    if (!producto.disponible) return;
    agregarProducto({
      producto,
      talle: producto.talle?.[0] ?? "M",
      color: producto.colores?.[0] ?? "Marron",
      cantidad: 1,
    });
  };

  const cabecera = (
    <View style={{ rowGap: Spacing.md, marginBottom: Spacing.md }}>
      {cargando ? <ActivityIndicator color={Colors.primary} /> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {!cargando && !error && !empresa ? <Text style={styles.empty}>Esta tienda no existe o todavía no está verificada.</Text> : null}
      {empresa ? (
        <>
          {empresa.estado !== "verificada" ? (
            <Text style={styles.aviso}>Vista previa: la tienda se publica cuando se verifique el CUIT.</Text>
          ) : null}
          {reputacion ? <ResumenReputacion promedio={reputacion.promedio} cantidad={reputacion.cantidad} /> : null}
          {empresa.descripcion ? <Text style={styles.cardText}>{empresa.descripcion}</Text> : null}
          {sedes.map((sede) => (
            <View key={sede.id} style={styles.card}>
              <Text style={styles.cardTitle}>{sede.nombre}</Text>
              <Text style={styles.cardText}>{sede.direccion}</Text>
              {sede.horarios ? <Text style={styles.muted}>{sede.horarios}</Text> : null}
              <Text style={styles.muted}>
                {[sede.haceRetiro && "Retiro en el local", sede.haceEnvio && "Envío a domicilio"].filter(Boolean).join(" · ")}
              </Text>
              <VerEnMapa direccion={sede.direccion} />
            </View>
          ))}
          {reputacion && reputacion.ultimas.length > 0 ? (
            <>
              <Text style={styles.sectionTitle}>Opiniones</Text>
              {reputacion.ultimas.map((opinion, i) => (
                <View key={`${opinion.fecha}-${i}`} style={styles.card}>
                  <View style={styles.cardRow}>
                    <Estrellas valor={opinion.puntaje} tamano={14} />
                    <Text style={styles.muted}>
                      {`${opinion.autor ?? "Comprador"} · ${new Date(opinion.fecha).toLocaleDateString("es-AR")}`}
                    </Text>
                  </View>
                  {opinion.comentario ? <Text style={styles.cardText}>{opinion.comentario}</Text> : null}
                  {opinion.respuesta ? <Text style={styles.muted}>{`Respuesta: ${opinion.respuesta}`}</Text> : null}
                </View>
              ))}
            </>
          ) : null}
          <Text style={styles.sectionTitle}>Publicaciones</Text>
        </>
      ) : null}
    </View>
  );

  return (
    <View style={styles.screen}>
      <EncabezadoPantalla titulo={empresa ? empresa.nombre.toUpperCase() : "TIENDA"} />
      <FlatList
        key={`tienda-${columnas}`}
        data={empresa ? productos : []}
        keyExtractor={(item) => item.id}
        numColumns={columnas}
        ListHeaderComponent={cabecera}
        ListEmptyComponent={empresa && !cargando ? <Text style={styles.empty}>Todavía no hay publicaciones.</Text> : null}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + Spacing.xl }]}
        columnWrapperStyle={{ columnGap: GAP }}
        renderItem={({ item }) => (
          <TarjetaProducto
            producto={item}
            scale={1}
            cardWidth={cardWidth}
            imageHeight={width >= 640 ? 140 : 110}
            onPressProducto={(producto) => router.push({ pathname: ROUTES.productDetail, params: { id: producto.id } })}
            onPressAgregar={onPressAgregar}
          />
        )}
      />
    </View>
  );
}
