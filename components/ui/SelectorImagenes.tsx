import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { ActivityIndicator, Image, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import Toast from 'react-native-toast-message';

import { Colors, FontSize, Radius, Spacing } from '../../constants/theme';
import { usePermission } from '../../hooks/usePermission';
import { MAX_IMAGENES } from '../../services/productosService';
import { pickImageFromCamera, pickImagesFromLibrary } from '../../services/storageService';
import { subirImagenProducto } from '../../services/supabase';

interface SelectorImagenesProps {
  imagenes: string[];
  onChange: (imagenes: string[]) => void;
  /** Avisa mientras se suben fotos, para bloquear el envío del formulario. */
  onSubiendoChange?: (subiendo: boolean) => void;
  deshabilitado?: boolean;
}

/** Fotos de la prenda: agregar (cámara o galería), quitar, ordenar y elegir la principal. */
export function SelectorImagenes({ imagenes, onChange, onSubiendoChange, deshabilitado }: SelectorImagenesProps) {
  const [subiendo, setSubiendo] = useState(false);
  const permisoCamara = usePermission(
    ImagePicker.requestCameraPermissionsAsync,
    'Sin acceso a la cámara no podés fotografiar la prenda.',
  );
  const permisoGaleria = usePermission(
    ImagePicker.requestMediaLibraryPermissionsAsync,
    'Sin acceso a la galería no podés elegir fotos.',
  );
  const lugares = MAX_IMAGENES - imagenes.length;
  // En la web no hay cámara: sólo galería (el selector de archivos del navegador).
  const fuentes = Platform.OS === 'web' ? (['library'] as const) : (['camera', 'library'] as const);

  const marcarSubiendo = (valor: boolean) => {
    setSubiendo(valor);
    onSubiendoChange?.(valor);
  };

  const agregar = async (fuente: 'camera' | 'library') => {
    if (lugares <= 0) {
      Toast.show({ type: 'info', text1: `Podés subir hasta ${MAX_IMAGENES} imágenes` });
      return;
    }

    const permiso = fuente === 'camera' ? permisoCamara : permisoGaleria;
    if (!(await permiso.request())) {
      return;
    }

    try {
      marcarSubiendo(true);
      const elegidas =
        fuente === 'camera'
          ? [await pickImageFromCamera()].filter((item) => item !== null)
          : await pickImagesFromLibrary(lugares);

      const urls: string[] = [];
      for (const imagen of elegidas) {
        urls.push(await subirImagenProducto(imagen.base64, imagen.mimeType));
      }

      if (urls.length > 0) {
        onChange([...imagenes, ...urls].slice(0, MAX_IMAGENES));
      }
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Error de imagen',
        text2: error instanceof Error ? error.message : 'No se pudo subir la imagen.',
      });
    } finally {
      marcarSubiendo(false);
    }
  };

  const mover = (desde: number, hacia: number) => {
    if (hacia < 0 || hacia >= imagenes.length) return;
    const copia = [...imagenes];
    const [item] = copia.splice(desde, 1);
    copia.splice(hacia, 0, item);
    onChange(copia);
  };

  const quitar = (indice: number) => onChange(imagenes.filter((_, i) => i !== indice));

  const bloqueado = subiendo || deshabilitado;

  return (
    <View style={styles.wrapper}>
      <Text style={styles.title}>
        Fotos ({imagenes.length}/{MAX_IMAGENES})
      </Text>
      <Text style={styles.hint}>La primera es la principal. Usá las flechas para ordenarlas.</Text>

      {imagenes.length > 0 ? (
        <View style={styles.grid}>
          {imagenes.map((url, indice) => (
            <View key={`${url}-${indice}`} style={styles.item}>
              <Image source={{ uri: url }} style={styles.thumb} />
              {indice === 0 ? <Text style={styles.badge}>Principal</Text> : null}
              <View style={styles.controls}>
                <Pressable
                  accessibilityLabel="Mover a la izquierda"
                  disabled={indice === 0}
                  onPress={() => mover(indice, indice - 1)}
                  style={[styles.control, indice === 0 && styles.disabled]}
                >
                  <Text style={styles.controlText}>‹</Text>
                </Pressable>
                <Pressable accessibilityLabel="Quitar foto" onPress={() => quitar(indice)} style={styles.control}>
                  <Text style={[styles.controlText, styles.danger]}>✕</Text>
                </Pressable>
                <Pressable
                  accessibilityLabel="Mover a la derecha"
                  disabled={indice === imagenes.length - 1}
                  onPress={() => mover(indice, indice + 1)}
                  style={[styles.control, indice === imagenes.length - 1 && styles.disabled]}
                >
                  <Text style={styles.controlText}>›</Text>
                </Pressable>
              </View>
              {indice > 0 ? (
                <Pressable onPress={() => mover(indice, 0)}>
                  <Text style={styles.link}>Hacer principal</Text>
                </Pressable>
              ) : null}
            </View>
          ))}
        </View>
      ) : null}

      {lugares > 0 ? (
        <View style={styles.buttons}>
          {fuentes.map((fuente) => (
            <Pressable
              key={fuente}
              disabled={bloqueado}
              onPress={() => void agregar(fuente)}
              style={[styles.button, bloqueado && styles.disabled]}
            >
              {subiendo ? (
                <ActivityIndicator color={Colors.primary} />
              ) : (
                <Text style={styles.buttonText}>
                  {fuente === 'camera' ? 'Tomar foto' : lugares > 1 ? `Galería (hasta ${lugares})` : 'Galería'}
                </Text>
              )}
            </Pressable>
          ))}
        </View>
      ) : (
        <Text style={styles.hint}>Llegaste al máximo de {MAX_IMAGENES} fotos.</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { rowGap: Spacing.sm, marginBottom: Spacing.md },
  title: { color: Colors.primary, fontSize: FontSize.lg, fontFamily: 'Montserrat_700Bold' },
  hint: { color: Colors.textMuted, fontSize: FontSize.sm, fontFamily: 'Montserrat_500Medium' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  item: { width: 104, rowGap: 4, alignItems: 'center' },
  thumb: { width: 104, height: 104, borderRadius: Radius.md, backgroundColor: Colors.backgroundMuted },
  badge: {
    position: 'absolute',
    top: 4,
    left: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Radius.sm,
    overflow: 'hidden',
    backgroundColor: Colors.secondary,
    color: Colors.white,
    fontSize: FontSize.xs,
    fontFamily: 'Montserrat_700Bold',
  },
  controls: { flexDirection: 'row', columnGap: 4 },
  control: {
    width: 30,
    height: 30,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surface,
  },
  controlText: { color: Colors.primary, fontSize: FontSize.lg, fontFamily: 'Montserrat_700Bold', lineHeight: 20 },
  danger: { color: Colors.danger, fontSize: FontSize.md },
  link: { color: Colors.secondary, fontSize: FontSize.xs, fontFamily: 'Montserrat_700Bold' },
  buttons: { flexDirection: 'row', gap: Spacing.sm },
  button: {
    flex: 1,
    minHeight: 44,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.secondary,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: { color: Colors.primary, fontSize: FontSize.md, fontFamily: 'Montserrat_600SemiBold' },
  disabled: { opacity: 0.4 },
});
