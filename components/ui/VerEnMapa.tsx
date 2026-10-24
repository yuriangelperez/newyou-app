import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { Colors, FontSize } from '../../constants/theme';
import { abrirDireccionEnMapa, buscarCoordenadas } from '../../services/locationService';
import { MapaItem } from '../MapaItem';

interface VerEnMapaProps {
  /** Dirección en texto a buscar; si está vacía no se muestra nada. */
  direccion: string;
  /** Cambiarlo abre el mapa y lo vuelve a buscar (p. ej. al tocar Enter en el campo). */
  pedido?: number;
}

// Espera a que se deje de escribir antes de buscar (Nominatim pide no más de 1 por segundo).
const ESPERA_MS = 700;

/**
 * Enlace "Ver en el mapa" para comprobar que una dirección escrita es correcta.
 * Muestra el mapa dentro de la app y lo actualiza mientras se corrige la dirección.
 */
export function VerEnMapa({ direccion, pedido = 0 }: VerEnMapaProps) {
  const [abierto, setAbierto] = useState(false);
  const [pedidoVisto, setPedidoVisto] = useState(pedido);
  const [buscando, setBuscando] = useState(false);
  const [punto, setPunto] = useState<{ latitud: number; longitud: number } | null>(null);
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

  return (
    <View style={styles.wrapper}>
      <Pressable accessibilityRole="link" onPress={() => setAbierto(!abierto)} style={styles.link}>
        <Text style={styles.text}>{abierto ? 'Ocultar mapa' : 'Ver en el mapa'}</Text>
      </Pressable>

      {abierto ? (
        <>
          {punto && !sinResultado ? (
            <MapaItem latitud={punto.latitud} longitud={punto.longitud} titulo={consulta} />
          ) : null}
          {buscando ? <ActivityIndicator size="small" color={Colors.secondary} /> : null}
          {sinResultado && !buscando ? (
            <Text style={styles.hint}>
              No encontramos esa dirección en el mapa. Revisá cómo está escrita.
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
});
