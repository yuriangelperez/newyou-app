import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { Colors, FontSize, Radius, Spacing } from '../../constants/theme';
import { recordarPunto, sugerirDirecciones, SugerenciaDireccion } from '../../services/locationService';

interface SugerenciasDireccionProps {
  /** Lo que el usuario está escribiendo. */
  texto: string;
  /** false para no buscar (p. ej. si el texto vino del GPS o de una sugerencia). */
  activo: boolean;
  onElegir: (direccion: string) => void;
}

// Espera a que se deje de escribir antes de pedir sugerencias.
const ESPERA_MS = 400;

/** Lista de direcciones parecidas a lo escrito (autocompletado con OpenStreetMap). */
export function SugerenciasDireccion({ texto, activo, onElegir }: SugerenciasDireccionProps) {
  const [sugerencias, setSugerencias] = useState<SugerenciaDireccion[]>([]);
  const [buscando, setBuscando] = useState(false);
  const consulta = texto.trim();

  useEffect(() => {
    if (!activo || consulta.length < 4) {
      return;
    }
    let cancelado = false;
    const espera = setTimeout(async () => {
      setBuscando(true);
      const resultado = await sugerirDirecciones(consulta);
      if (cancelado) return;
      setBuscando(false);
      setSugerencias(resultado);
    }, ESPERA_MS);
    return () => {
      cancelado = true;
      clearTimeout(espera);
    };
  }, [activo, consulta]);

  if (!activo || consulta.length < 4 || (sugerencias.length === 0 && !buscando)) {
    return null;
  }

  return (
    <View style={styles.lista} testID="sugerencias-direccion">
      {buscando && sugerencias.length === 0 ? (
        <ActivityIndicator size="small" color={Colors.secondary} style={styles.cargando} />
      ) : null}
      {sugerencias.map((sugerencia) => (
        <Pressable
          key={sugerencia.texto}
          accessibilityRole="button"
          onPress={() => {
            recordarPunto(sugerencia.texto, sugerencia);
            setSugerencias([]);
            onElegir(sugerencia.texto);
          }}
          style={styles.item}
        >
          <Ionicons name="location-outline" size={16} color={Colors.secondary} />
          <Text style={styles.texto} numberOfLines={2}>
            {sugerencia.texto}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  lista: {
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.secondary,
    backgroundColor: Colors.surface,
    overflow: 'hidden',
  },
  cargando: { padding: Spacing.sm },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  texto: { flex: 1, color: Colors.text, fontSize: FontSize.sm, fontFamily: 'Montserrat_400Regular' },
});
