import { Ionicons } from '@expo/vector-icons';
import type { ReactNode } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Colors, Radius } from '../../constants/theme';

export interface SeccionFiltro {
  id: string;
  titulo: string;
  opciones?: readonly string[];
  valor?: string;
  onCambiar?: (valor: string) => void;
  /** Contenido propio de la sección (p. ej. el filtro de precio); reemplaza a la lista de opciones. */
  contenido?: ReactNode;
  /** "chips" para opciones cortas (p. ej. talles): van en filas y ocupan menos lugar. */
  estilo?: 'lista' | 'chips';
}

interface PanelFiltrosProps {
  visible: boolean;
  onCerrar: () => void;
  secciones: SeccionFiltro[];
  /** Vuelve todas las secciones a su primera opción. */
  onLimpiar: () => void;
}

/** Panel que abre el botón de filtros del inicio: cada sección es una lista vertical de opciones. */
export function PanelFiltros({ visible, onCerrar, secciones, onLimpiar }: PanelFiltrosProps) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCerrar}>
      <Pressable style={styles.fondo} onPress={onCerrar} accessibilityLabel="Cerrar filtros">
        <Pressable style={styles.panel} onPress={() => {}} testID="panel-filtros">
          <View style={styles.encabezado}>
            <Text style={styles.panelTitulo}>Ordenar y filtrar</Text>
            <Pressable accessibilityRole="button" accessibilityLabel="Cerrar" onPress={onCerrar} hitSlop={8}>
              <Ionicons name="close" size={22} color={Colors.textEarth} />
            </Pressable>
          </View>

          <ScrollView style={styles.cuerpo}>
            {secciones.map((seccion) => (
              <View key={seccion.id} style={styles.seccion}>
                <Text style={styles.seccionTitulo}>{seccion.titulo}</Text>
                {seccion.contenido ? (
                  seccion.contenido
                ) : seccion.estilo === 'chips' ? (
                  <View style={styles.chips}>
                    {(seccion.opciones ?? []).map((opcion) => {
                      const elegida = opcion === seccion.valor;
                      return (
                        <Pressable
                          key={opcion}
                          testID={`filtro-${seccion.id}-${opcion}`}
                          accessibilityRole="radio"
                          accessibilityState={{ checked: elegida }}
                          style={[styles.chip, elegida && styles.chipElegido]}
                          onPress={() => seccion.onCambiar?.(opcion)}>
                          <Text style={[styles.chipTexto, elegida && styles.chipTextoElegido]}>{opcion}</Text>
                        </Pressable>
                      );
                    })}
                  </View>
                ) : (seccion.opciones ?? []).map((opcion) => {
                  const elegida = opcion === seccion.valor;
                  return (
                    <Pressable
                      key={opcion}
                      testID={`filtro-${seccion.id}-${opcion}`}
                      accessibilityRole="radio"
                      accessibilityState={{ checked: elegida }}
                      style={[styles.opcion, elegida && styles.opcionElegida]}
                      onPress={() => seccion.onCambiar?.(opcion)}>
                      <Ionicons
                        name={elegida ? 'radio-button-on' : 'radio-button-off'}
                        size={18}
                        color={elegida ? Colors.primary : Colors.textEarthMuted}
                      />
                      <Text style={[styles.opcionTexto, elegida && styles.opcionTextoElegida]}>{opcion}</Text>
                    </Pressable>
                  );
                })}
              </View>
            ))}
          </ScrollView>

          <View style={styles.pie}>
            <Pressable accessibilityRole="button" style={styles.botonLimpiar} onPress={onLimpiar} testID="filtros-limpiar">
              <Text style={styles.botonLimpiarTexto}>Limpiar</Text>
            </Pressable>
            <Pressable accessibilityRole="button" style={styles.botonListo} onPress={onCerrar} testID="filtros-listo">
              <Text style={styles.botonListoTexto}>Ver resultados</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fondo: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  panel: {
    width: '100%',
    maxWidth: 400,
    maxHeight: '85%',
    borderRadius: Radius.lg,
    backgroundColor: Colors.surface,
    paddingTop: 14,
  },
  encabezado: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingBottom: 6,
  },
  panelTitulo: {
    color: Colors.primary,
    fontSize: 17,
    fontFamily: 'Montserrat_700Bold',
  },
  cuerpo: {
    flexGrow: 0,
  },
  seccion: {
    paddingTop: 10,
  },
  seccionTitulo: {
    color: Colors.textEarthMuted,
    fontSize: 12,
    fontFamily: 'Montserrat_600SemiBold',
    textTransform: 'uppercase',
    paddingHorizontal: 18,
    paddingBottom: 4,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: 18,
    paddingVertical: 4,
  },
  chip: {
    minWidth: 44,
    height: 34,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.tertiary,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  chipElegido: {
    backgroundColor: Colors.secondary,
    borderColor: Colors.secondary,
  },
  chipTexto: {
    color: Colors.text,
    fontSize: 13,
    fontFamily: 'Montserrat_500Medium',
  },
  chipTextoElegido: {
    color: Colors.white,
    fontFamily: 'Montserrat_600SemiBold',
  },
  opcion: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  opcionElegida: {
    backgroundColor: Colors.accentSoft,
  },
  opcionTexto: {
    color: Colors.text,
    fontSize: 14,
    fontFamily: 'Montserrat_400Regular',
  },
  opcionTextoElegida: {
    color: Colors.primary,
    fontFamily: 'Montserrat_600SemiBold',
  },
  pie: {
    flexDirection: 'row',
    gap: 10,
    padding: 14,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  botonLimpiar: {
    flex: 1,
    height: 44,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  botonLimpiarTexto: {
    color: Colors.secondary,
    fontSize: 14,
    fontFamily: 'Montserrat_600SemiBold',
  },
  botonListo: {
    flex: 2,
    height: 44,
    borderRadius: Radius.md,
    backgroundColor: Colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  botonListoTexto: {
    color: Colors.white,
    fontSize: 14,
    fontFamily: 'Montserrat_700Bold',
  },
});
