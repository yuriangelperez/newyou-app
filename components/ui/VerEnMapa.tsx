import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { Colors, FontSize, Radius } from '../../constants/theme';
import {
  abrirDireccionEnMapa,
  buscarCoordenadas,
  direccionDeCoordenadas,
  recordarPunto,
} from '../../services/locationService';
import { MapaItem } from '../MapaItem';
import { MapaPin } from '../MapaPin';

interface VerEnMapaProps {
  /** Dirección en texto a buscar; si está vacía no se muestra nada. */
  direccion: string;
  /** Cambiarlo abre el mapa y lo vuelve a buscar (p. ej. al tocar Enter en el campo). */
  pedido?: number;
  /**
   * Si se pasa, el mapa tiene un pin que el usuario puede mover para marcar su
   * ubicación; al confirmar, se carga la dirección de ese punto.
   */
  onElegirDireccion?: (direccion: string) => void;
}

// Centro de Pilar: donde arranca el pin si la dirección no aparece en el mapa.
const PILAR = { latitud: -34.4587, longitud: -58.9142 };

// Espera a que se deje de escribir antes de buscar (Nominatim pide no más de 1 por segundo).
const ESPERA_MS = 700;

/**
 * Enlace "Ver en el mapa" para comprobar que una dirección escrita es correcta.
 * Muestra el mapa dentro de la app y lo actualiza mientras se corrige la dirección.
 */
export function VerEnMapa({ direccion, pedido = 0, onElegirDireccion }: VerEnMapaProps) {
  // Punto donde el usuario dejó el pin y la dirección que le corresponde.
  const [pin, setPin] = useState<{ latitud: number; longitud: number; direccion: string | null } | null>(null);
  const [abierto, setAbierto] = useState(false);
  const [pedidoVisto, setPedidoVisto] = useState(pedido);
  const [buscando, setBuscando] = useState(false);
  const [punto, setPunto] = useState<{ latitud: number; longitud: number; aproximada?: boolean } | null>(null);
  const [sinResultado, setSinResultado] = useState(false);
  const consulta = direccion.trim();

  if (pedido !== pedidoVisto) {
    setPedidoVisto(pedido);
    setAbierto(true);
  }

  useEffect(() => {
    if (!abierto || !consulta) {
      return;
    }

    let cancelado = false;
    const espera = setTimeout(async () => {
      setBuscando(true);
      const resultado = await buscarCoordenadas(consulta);
      if (cancelado) {
        return;
      }
      setBuscando(false);
      setPin(null);
      setPunto(resultado);
      setSinResultado(!resultado);
    }, ESPERA_MS);

    return () => {
      cancelado = true;
      clearTimeout(espera);
    };
  }, [abierto, consulta, pedidoVisto]);

  if (!consulta) {
    return null;
  }

  const moverPin = async (latitud: number, longitud: number) => {
    setPin({ latitud, longitud, direccion: null });
    const encontrada = await direccionDeCoordenadas(latitud, longitud);
    setPin((actual) =>
      actual && actual.latitud === latitud && actual.longitud === longitud
        ? { ...actual, direccion: encontrada || `${latitud.toFixed(5)}, ${longitud.toFixed(5)}` }
        : actual,
    );
  };

  const usarPin = () => {
    if (!pin?.direccion || !onElegirDireccion) return;
    // Si el mapa no conoce la altura del punto, se deja lo que escribió el usuario
    // (con su número) y se guarda el punto marcado para esa dirección.
    const elegida = /\d/.test(pin.direccion.split(',')[0]) ? pin.direccion : consulta;
    recordarPunto(elegida, pin);
    setPunto({ latitud: pin.latitud, longitud: pin.longitud });
    setSinResultado(false);
    onElegirDireccion(elegida);
    setPin(null);
  };

  const conPin = Boolean(onElegirDireccion);
  const inicioPin = punto && !sinResultado ? punto : PILAR;

  return (
    <View style={styles.wrapper}>
      <Pressable accessibilityRole="link" onPress={() => setAbierto(!abierto)} style={styles.link}>
        <Text style={styles.text}>{abierto ? 'Ocultar mapa' : 'Ver en el mapa'}</Text>
      </Pressable>

      {abierto ? (
        <>
          {conPin && !buscando ? (
            <>
              <MapaPin latitud={inicioPin.latitud} longitud={inicioPin.longitud} onMover={(lat, lng) => void moverPin(lat, lng)} />
              <Text style={styles.hint}>Tocá el mapa o arrastrá el pin hasta tu puerta.</Text>
              {pin ? (
                <View style={styles.pinBox} testID="mapa-pin-elegido">
                  <Text style={styles.pinTexto}>
                    {pin.direccion ? `Pin en: ${pin.direccion}` : 'Buscando la dirección del pin...'}
                  </Text>
                  <Pressable
                    accessibilityRole="button"
                    testID="mapa-usar-pin"
                    disabled={!pin.direccion}
                    onPress={usarPin}
                    style={[styles.pinBoton, !pin.direccion && styles.pinBotonApagado]}
                  >
                    <Text style={styles.pinBotonTexto}>Usar esta ubicación</Text>
                  </Pressable>
                </View>
              ) : null}
            </>
          ) : punto && !sinResultado ? (
            <MapaItem latitud={punto.latitud} longitud={punto.longitud} titulo={consulta} />
          ) : null}
          {punto?.aproximada && !buscando ? (
            <Text style={styles.hint} testID="mapa-aproximado">
              No encontramos la altura exacta: el marcador muestra la calle. Revisá que sea la correcta.
            </Text>
          ) : null}
          {buscando ? <ActivityIndicator size="small" color={Colors.secondary} /> : null}
          {sinResultado && !buscando ? (
            <Text style={styles.hint}>
              {conPin
                ? 'No encontramos esa dirección en el mapa. Marcala con el pin.'
                : 'No encontramos esa dirección en el mapa. Revisá cómo está escrita.'}
            </Text>
          ) : null}
          <Pressable
            accessibilityRole="link"
            onPress={() => void abrirDireccionEnMapa(consulta)}
            style={styles.link}
          >
            <Text style={styles.secundario}>Abrir en Google Maps</Text>
          </Pressable>
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: 6 },
  link: { alignSelf: 'flex-start', paddingVertical: 4 },
  text: {
    color: Colors.secondary,
    fontSize: FontSize.sm,
    fontFamily: 'Montserrat_700Bold',
    textDecorationLine: 'underline',
  },
  secundario: {
    color: Colors.textMuted,
    fontSize: FontSize.sm,
    textDecorationLine: 'underline',
  },
  hint: { color: Colors.textMuted, fontSize: FontSize.sm },
  pinBox: {
    gap: 6,
    padding: 10,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.secondary,
  },
  pinTexto: { color: Colors.textStrong, fontSize: FontSize.sm },
  pinBoton: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.secondary,
    borderRadius: Radius.md,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  pinBotonApagado: { opacity: 0.5 },
  pinBotonTexto: { color: Colors.white, fontFamily: 'Montserrat_700Bold', fontSize: FontSize.sm },
});
