import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { ActivityIndicator, FlatList, Text, useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import TarjetaProducto from "../../components/TarjetaProducto";
import { EncabezadoPantalla } from "../../components/ui/EncabezadoPantalla";
import { Estrellas, ResumenReputacion } from "../../components/ui/Estrellas";
import { ROUTES } from "../../constants/routes";
import { estilosFormulario as styles } from "../../constants/estilosFormulario";
import { Colors, Spacing } from "../../constants/theme";
import { getNombreVendedor, getProductosDeVendedor } from "../../services/productosService";
import { obtenerReputacion, Reputacion } from "../../services/pedidosService";
import { useCarritoStore } from "../../stores/useCarritoStore";
import { Producto } from "../../types";

const GAP = 16;

/** Página pública de un particular: sus opiniones y todas sus publicaciones, también las agotadas. */
export default function VendedorScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { id } = useLocalSearchParams<{ id: string }>();
  const agregarProducto = useCarritoStore((state) => state.agregarProducto);
  const [nombre, setNombre] = useState<string | null>(null);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [reputacion, setReputacion] = useState<Reputacion | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const ancho = Math.min(width, 800);
  const columnas = ancho >= 640 ? 3 : 2;
  const cardWidth = Math.max(Math.floor((ancho - Spacing.md * 2 - (columnas - 1) * GAP) / columnas), 150);

  useFocusEffect(
    useCallback(() => {
      if (!id) return;
      setError(null);
      Promise.all([getNombreVendedor(id), getProductosDeVendedor(id), obtenerReputacion({ vendedorId: id })])
        .then(([nombreVendedor, publicaciones, opiniones]) => {
          setNombre(nombreVendedor);
          // Disponibles primero; las agotadas quedan al final.
          setProductos([...publicaciones].sort((a, b) => Number(b.disponible) - Number(a.disponible)));
          setReputacion(opiniones);
        })
        .catch((err) => setError(err instanceof Error ? err.message : "No se pudo cargar el vendedor."))
        .finally(() => setCargando(false));
    }, [id]),
  );

  const onPressAgregar = (producto: Producto) => {
    if (!producto.disponible) return;
    agregarProducto({
      producto,
      talle: producto.talle?.[0] ?? "Único",
      color: producto.colores?.[0] ?? "",
      cantidad: 1,
    });
  };

  const cabecera = (
    <View style={{ rowGap: Spacing.md, marginBottom: Spacing.md }}>
      {cargando ? <ActivityIndicator color={Colors.primary} /> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {!cargando && !error ? (
        <>
          <Text style={styles.cardText}>Vendedor particular</Text>
          {reputacion ? <ResumenReputacion promedio={reputacion.promedio} cantidad={reputacion.cantidad} /> : null}
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
      <EncabezadoPantalla titulo={nombre ? nombre.toUpperCase() : "VENDEDOR"} />
      <FlatList
        key={`vendedor-${columnas}`}
        data={productos}
        keyExtractor={(item) => item.id}
        numColumns={columnas}
        ListHeaderComponent={cabecera}
        ListEmptyComponent={!cargando && !error ? <Text style={styles.empty}>Todavía no hay publicaciones.</Text> : null}
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
