import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import Toast from 'react-native-toast-message';

import { Colors, FontSize, Radius, Spacing } from '../constants/theme';
import { textoPlazo, subirFotoVerificacion } from '../services/verificacionService';
import { Producto } from '../types';

const TEXTO: Record<string, string> = {
  pendiente: 'En verificación',
  requiere_cambios: 'Faltan datos',
  rechazada: 'Rechazada',
  aprobada: 'Verificada por New You',
};

/**
 * Estado de la verificación de una prenda usada, en Mis publicaciones. Mientras está
 * pendiente muestra el código y el botón para sacar la foto de la prenda con el código.
 */
export function EstadoVerificacion({ producto, onCambio }: { producto: Producto; onCambio: () => void }) {
  const [subiendo, setSubiendo] = useState(false);
  const verificacion = producto.verificacion;
  if (producto.condicion !== 'usado' || !verificacion || verificacion.estado === 'no_aplica') {
    return null;
  }

  const esperando = verificacion.estado === 'pendiente' || verificacion.estado === 'requiere_cambios';

  const onSubir = async () => {
    try {
      setSubiendo(true);
      if (await subirFotoVerificacion(producto.id)) {
        Toast.show({ type: 'success', text1: 'Foto enviada', text2: 'La revisamos dentro del plazo.' });
        onCambio();
      }
    } catch (error) {
      Toast.show({ type: 'error', text1: 'No se pudo subir la foto', text2: error instanceof Error ? error.message : undefined });
    } finally {
      setSubiendo(false);
    }
  };

  return (
    <View style={styles.caja} testID={`verificacion-${producto.id}`}>
      <Text
        style={[
          styles.estado,
          verificacion.estado === 'aprobada' && styles.ok,
          verificacion.estado === 'rechazada' && styles.mal,
        ]}
      >
        {TEXTO[verificacion.estado]}
        {esperando ? ` · ${textoPlazo(verificacion.venceAt)}` : ''}
      </Text>
      {verificacion.motivo && verificacion.estado !== 'aprobada' ? (
        <Text style={styles.texto}>{`Motivo: ${verificacion.motivo}`}</Text>
      ) : null}
      {esperando ? (
        <>
          <Text style={styles.texto}>
            {verificacion.fotoUrl && verificacion.estado === 'pendiente'
              ? 'Ya recibimos tu foto. Te avisamos cuando la revisemos.'
              : `Escribí el código ${verificacion.codigo ?? ''} en un papel, ponelo junto a la prenda y sacale una foto.`}
          </Text>
          {!verificacion.fotoUrl || verificacion.estado === 'requiere_cambios' ? (
            <Pressable
              testID={`verificacion-subir-${producto.id}`}
              accessibilityRole="button"
              onPress={() => void onSubir()}
              disabled={subiendo}
              style={[styles.boton, subiendo && styles.deshabilitado]}
            >
              {subiendo ? (
                <ActivityIndicator color={Colors.background} />
              ) : (
                <Text style={styles.botonTexto}>SACAR FOTO CON EL CÓDIGO</Text>
              )}
            </Pressable>
          ) : null}
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  caja: {
    marginTop: Spacing.xs,
    padding: Spacing.xs,
    borderRadius: Radius.md,
    backgroundColor: Colors.background,
    gap: 4,
  },
  estado: { color: Colors.warning, fontSize: FontSize.sm, fontWeight: '700' },
  ok: { color: Colors.success },
  mal: { color: Colors.danger },
  texto: { color: Colors.text, fontSize: FontSize.xs },
  boton: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.primary,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.sm,
    minHeight: 32,
    justifyContent: 'center',
  },
  deshabilitado: { opacity: 0.5 },
  botonTexto: { color: Colors.background, fontSize: FontSize.xs, fontWeight: '700' },
});
