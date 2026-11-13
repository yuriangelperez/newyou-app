import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { ReactNode, useCallback, useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Image,
  ImageSourcePropType,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { MOSTRAR_PLACA_APP, PlacaDescargarApp } from './BannerDemo';

/** Cada cuánto pasa sola a la placa siguiente. */
const INTERVALO_MS = 5500;
/** Espera para dar por terminado un desplazamiento (anda igual en el celular y en la web). */
const FIN_SCROLL_MS = 120;

interface Foto {
  source: ImageSourcePropType;
  /** Ancho / alto de la imagen, para no deformarla. */
  proporcion: number;
}

const FOTOS = {
  abrigo: { source: require('../assets/images/home-hero/fotos/abrigo.jpg'), proporcion: 190 / 282 },
  naranja: { source: require('../assets/images/home-hero/fotos/naranja.jpg'), proporcion: 162 / 143 },
  sentada: { source: require('../assets/images/home-hero/fotos/sentada.jpg'), proporcion: 158 / 182 },
  cartera: { source: require('../assets/images/home-hero/fotos/cartera.jpg'), proporcion: 158 / 97 },
  saco: { source: require('../assets/images/home-hero/fotos/saco.jpg'), proporcion: 159 / 184 },
  jean: { source: require('../assets/images/home-hero/fotos/jean.jpg'), proporcion: 110 / 148 },
} satisfies Record<string, Foto>;

interface Placa {
  clave: string;
  fondo: string;
  etiqueta: string;
  colorEtiqueta: string;
  titulo: string;
  colorTitulo: string;
  bajada: string;
  colorBajada: string;
  boton: string;
  /** Botón claro sobre fondo oscuro, u oscuro sobre fondo claro. */
  botonClaro: boolean;
  /** La foto grande y la que la acompaña (ésta sólo en la compu). */
  fotos: [Foto, Foto];
  onPress: () => void;
}

interface HeroCarruselProps {
  ancho: number;
  alto: number;
  escritorio: boolean;
  /** Filtra el catálogo por un tag del inicio ("Primavera", "Promociones"). */
  onElegirTag: (tag: string) => void;
  onPublicar: () => void;
}

/**
 * Carrusel del inicio. Pasa solo, en bucle, mientras nadie lo usa: se frena al tocarlo o
 * arrastrarlo, con el mouse encima (web), fuera de la pantalla y si el sistema pide reducir
 * el movimiento. Al final vuelve a la primera placa sin rebobinar (copia de la primera al final).
 */
export function HeroCarrusel({ ancho, alto, escritorio, onElegirTag, onPublicar }: HeroCarruselProps) {
  const placas: Placa[] = [
    {
      clave: 'primavera',
      fondo: '#F3ECE6',
      etiqueta: 'NUEVA TEMPORADA',
      colorEtiqueta: '#AB876D',
      titulo: 'La primavera llegó',
      colorTitulo: '#2D1F16',
      bajada: 'Prendas nuevas y usadas para renovar tu placard.',
      colorBajada: '#6B5446',
      boton: 'Ver primavera',
      botonClaro: false,
      fotos: [FOTOS.abrigo, FOTOS.naranja],
      onPress: () => onElegirTag('Primavera'),
    },
    {
      clave: 'rebajas',
      fondo: '#493628',
      etiqueta: 'REBAJAS DE PRIMAVERA',
      colorEtiqueta: '#E8D7CB',
      titulo: 'Hasta -50% en prendas seleccionadas',
      colorTitulo: '#FFFFFF',
      bajada: 'Descuentos de vendedores y tiendas, por tiempo limitado.',
      colorBajada: '#D5BFB3',
      boton: 'Ver promociones',
      botonClaro: true,
      fotos: [FOTOS.sentada, FOTOS.cartera],
      onPress: () => onElegirTag('Promociones'),
    },
    {
      clave: 'vender',
      fondo: '#E8D7CB',
      etiqueta: 'VENDÉ EN NEW YOU',
      colorEtiqueta: '#8A6A55',
      titulo: 'Dale una segunda vida a tu ropa',
      colorTitulo: '#2D1F16',
      bajada: 'Publicá en minutos y cobrá tus ventas todas las semanas.',
      colorBajada: '#6B5446',
      boton: 'Publicar una prenda',
      botonClaro: false,
      fotos: [FOTOS.saco, FOTOS.jean],
      onPress: onPublicar,
    },
  ];

  const vistas: { clave: string; nodo: (clave: string) => ReactNode }[] = [
    ...(MOSTRAR_PLACA_APP
      ? [
          {
            clave: 'app',
            nodo: (clave: string) => (
              <PlacaDescargarApp key={clave} ancho={ancho} alto={alto} escritorio={escritorio} />
            ),
          },
        ]
      : []),
    ...placas.map((placa) => ({
      clave: placa.clave,
      nodo: (clave: string) => (
        <PlacaHero key={clave} placa={placa} ancho={ancho} alto={alto} escritorio={escritorio} />
      ),
    })),
  ];
  const total = vistas.length;

  const scrollRef = useRef<ScrollView>(null);
  const indiceRef = useRef(0);
  const finScrollRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [indice, setIndice] = useState(0);
  const [enPantalla, setEnPantalla] = useState(true);
  const [mouseEncima, setMouseEncima] = useState(false);
  const [tocando, setTocando] = useState(false);
  const [reducirMovimiento, setReducirMovimiento] = useState(false);
  // Cambia con cada uso, para que el contador arranque de cero después de tocarlo.
  const [usos, setUsos] = useState(0);

  useFocusEffect(
    useCallback(() => {
      setEnPantalla(true);
      return () => setEnPantalla(false);
    }, []),
  );

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled()
      .then(setReducirMovimiento)
      .catch(() => undefined);
    const suscripcion = AccessibilityInfo.addEventListener('reduceMotionChanged', setReducirMovimiento);
    return () => suscripcion.remove();
  }, []);

  useEffect(() => () => {
    if (finScrollRef.current) clearTimeout(finScrollRef.current);
  }, []);

  const irA = useCallback(
    (posicion: number, animado = true) => {
      scrollRef.current?.scrollTo({ x: posicion * ancho, animated: animado });
    },
    [ancho],
  );

  const marcar = useCallback((visible: number) => {
    indiceRef.current = visible;
    setIndice(visible);
  }, []);

  // Si cambia el ancho (ventana de la web), se queda en la misma placa.
  useEffect(() => {
    irA(indiceRef.current, false);
  }, [irA]);

  const siguiente = useCallback(() => {
    const destino = indiceRef.current + 1;
    // Desde la última va a la copia de la primera; al terminar se salta a la primera real.
    irA(destino);
    marcar(destino % total);
  }, [irA, marcar, total]);

  const anterior = useCallback(() => {
    if (indiceRef.current === 0) {
      irA(total, false);
      requestAnimationFrame(() => irA(total - 1));
      marcar(total - 1);
      return;
    }
    irA(indiceRef.current - 1);
    marcar(indiceRef.current - 1);
  }, [irA, marcar, total]);

  const usar = () => setUsos((n) => n + 1);

  const pasaSolo = total > 1 && enPantalla && !mouseEncima && !tocando && !reducirMovimiento;

  useEffect(() => {
    if (!pasaSolo) return;
    const temporizador = setTimeout(siguiente, INTERVALO_MS);
    return () => clearTimeout(temporizador);
  }, [pasaSolo, indice, usos, siguiente]);

  const alDesplazar = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const x = event.nativeEvent.contentOffset.x;
    if (finScrollRef.current) clearTimeout(finScrollRef.current);
    finScrollRef.current = setTimeout(() => {
      let posicion = Math.round(x / ancho);
      if (posicion >= total) {
        irA(0, false);
        posicion = 0;
      }
      marcar(Math.max(0, posicion));
    }, FIN_SCROLL_MS);
  };

  const empezarATocar = () => setTocando(true);
  const dejarDeTocar = () => {
    setTocando(false);
    usar();
  };

  return (
    <View
      style={[styles.contenedor, { width: ancho, height: alto, borderRadius: escritorio ? 14 : 0 }]}
      testID="hero-carrusel"
      onPointerEnter={(e) => {
        if (e.nativeEvent.pointerType === 'mouse') setMouseEncima(true);
      }}
      onPointerLeave={(e) => {
        if (e.nativeEvent.pointerType === 'mouse') {
          setMouseEncima(false);
          usar();
        }
      }}
      onTouchStart={empezarATocar}
      onTouchEnd={dejarDeTocar}
      onTouchCancel={dejarDeTocar}
    >
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        bounces={false}
        scrollEventThrottle={32}
        onScroll={alDesplazar}
        onScrollBeginDrag={empezarATocar}
        onScrollEndDrag={dejarDeTocar}
      >
        {vistas.map((vista) => vista.nodo(vista.clave))}
        {/* Copia de la primera placa: hace que el bucle siga hacia adelante. */}
        {total > 1 ? vistas[0].nodo(`${vistas[0].clave}-copia`) : null}
      </ScrollView>

      {escritorio && total > 1 ? (
        <>
          <Pressable
            testID="hero-anterior"
            accessibilityRole="button"
            accessibilityLabel="Placa anterior"
            onPress={() => {
              anterior();
              usar();
            }}
            style={({ pressed }) => [styles.flecha, styles.flechaIzquierda, pressed && styles.flechaPresionada]}
          >
            <Ionicons name="chevron-back" size={20} color="#2D1F16" />
          </Pressable>
          <Pressable
            testID="hero-siguiente"
            accessibilityRole="button"
            accessibilityLabel="Placa siguiente"
            onPress={() => {
              siguiente();
              usar();
            }}
            style={({ pressed }) => [styles.flecha, styles.flechaDerecha, pressed && styles.flechaPresionada]}
          >
            <Ionicons name="chevron-forward" size={20} color="#2D1F16" />
          </Pressable>
        </>
      ) : null}

      {total > 1 ? (
        <View style={[styles.puntos, escritorio ? styles.puntosEscritorio : styles.puntosCelular]}>
          {vistas.map((vista, i) => (
            <Pressable
              key={vista.clave}
              testID={`hero-punto-${i}`}
              accessibilityRole="button"
              accessibilityLabel={`Ir a la placa ${i + 1}`}
              accessibilityState={{ selected: i === indice }}
              hitSlop={6}
              onPress={() => {
                irA(i);
                marcar(i);
                usar();
              }}
              style={[styles.punto, i === indice && styles.puntoActivo]}
            />
          ))}
        </View>
      ) : null}
    </View>
  );
}

interface PlacaHeroProps {
  placa: Placa;
  ancho: number;
  alto: number;
  escritorio: boolean;
}

function PlacaHero({ placa, ancho, alto, escritorio }: PlacaHeroProps) {
  const [principal, secundaria] = placa.fotos;
  const altoPrincipal = Math.round(alto * (escritorio ? 0.8 : 0.66));
  const altoSecundaria = Math.round(alto * 0.5);

  return (
    <View style={[styles.placa, { width: ancho, height: alto, backgroundColor: placa.fondo }]} testID={`hero-placa-${placa.clave}`}>
      <View style={[styles.textos, escritorio ? styles.textosEscritorio : styles.textosCelular]}>
        <Text style={[styles.etiqueta, !escritorio && styles.etiquetaCelular, { color: placa.colorEtiqueta }]}>
          {placa.etiqueta}
        </Text>
        <Text
          style={[styles.titulo, escritorio ? styles.tituloEscritorio : styles.tituloCelular, { color: placa.colorTitulo }]}
          numberOfLines={escritorio ? 2 : 3}
        >
          {placa.titulo}
        </Text>
        {escritorio ? <Text style={[styles.bajada, { color: placa.colorBajada }]}>{placa.bajada}</Text> : null}
        <Pressable
          testID={`hero-boton-${placa.clave}`}
          accessibilityRole="button"
          onPress={placa.onPress}
          style={({ pressed }) => [
            styles.boton,
            !escritorio && styles.botonCelular,
            { backgroundColor: placa.botonClaro ? '#FFFFFF' : '#2D1F16' },
            pressed && styles.botonPresionado,
          ]}
        >
          <Text
            style={[
              styles.botonTexto,
              !escritorio && styles.botonTextoCelular,
              { color: placa.botonClaro ? '#2D1F16' : '#FFFFFF' },
            ]}
          >
            {placa.boton}
          </Text>
          <Ionicons name="arrow-forward" size={escritorio ? 16 : 13} color={placa.botonClaro ? '#2D1F16' : '#FFFFFF'} />
        </Pressable>
      </View>

      <View style={[styles.fotos, escritorio ? styles.fotosEscritorio : styles.fotosCelular]}>
        {escritorio ? (
          <Image
            source={secundaria.source}
            style={[
              styles.foto,
              styles.fotoSecundaria,
              { height: altoSecundaria, width: Math.round(altoSecundaria * secundaria.proporcion) },
            ]}
            accessibilityIgnoresInvertColors
          />
        ) : null}
        <Image
          source={principal.source}
          style={[styles.foto, { height: altoPrincipal, width: Math.round(altoPrincipal * principal.proporcion) }]}
          accessibilityIgnoresInvertColors
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: { overflow: 'hidden', position: 'relative', backgroundColor: '#F3ECE6' },
  placa: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', overflow: 'hidden' },
  textos: { flex: 1, justifyContent: 'center' },
  textosEscritorio: { paddingLeft: 72, paddingRight: 24, rowGap: 12 },
  textosCelular: { paddingLeft: 20, paddingRight: 8, rowGap: 6 },
  etiqueta: { fontSize: 12, letterSpacing: 1.5, fontFamily: 'Montserrat_700Bold' },
  etiquetaCelular: { fontSize: 10, letterSpacing: 1 },
  titulo: { fontFamily: 'Montserrat_700Bold' },
  tituloEscritorio: { fontSize: 34, lineHeight: 40, maxWidth: 520 },
  tituloCelular: { fontSize: 18, lineHeight: 22 },
  bajada: { fontSize: 15, lineHeight: 22, maxWidth: 440, fontFamily: 'Montserrat_400Regular' },
  boton: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: 8,
    borderRadius: 999,
    paddingHorizontal: 22,
    paddingVertical: 11,
    marginTop: 4,
  },
  botonCelular: { paddingHorizontal: 14, paddingVertical: 7, columnGap: 6, marginTop: 2 },
  botonPresionado: { opacity: 0.85 },
  botonTexto: { fontSize: 15, fontFamily: 'Montserrat_700Bold' },
  botonTextoCelular: { fontSize: 13 },
  fotos: { flexDirection: 'row', alignItems: 'flex-end' },
  fotosEscritorio: { marginRight: 72, columnGap: 14 },
  fotosCelular: { marginRight: 18, marginBottom: 16 },
  foto: { borderRadius: 12, borderWidth: 3, borderColor: '#FFFFFF' },
  fotoSecundaria: { marginBottom: 18 },
  flecha: {
    position: 'absolute',
    top: '50%',
    marginTop: -18,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.85)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  flechaIzquierda: { left: 16 },
  flechaDerecha: { right: 16 },
  flechaPresionada: { backgroundColor: '#FFFFFF' },
  puntos: {
    position: 'absolute',
    bottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: 6,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: 'rgba(45,31,22,0.35)',
    zIndex: 10,
  },
  puntosEscritorio: { alignSelf: 'center' },
  // En el celular van abajo a la derecha, para no tapar el botón de la placa.
  puntosCelular: { right: 12, bottom: 8 },
  punto: { width: 7, height: 7, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.55)' },
  puntoActivo: { width: 18, backgroundColor: '#FFFFFF' },
});
