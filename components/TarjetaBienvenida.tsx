import { ComponentProps } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Image, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { BRANDING_LOGO } from '../constants/assets';
import { Colors, Radius, Shadow } from '../constants/theme';

type Funcionalidad = {
  icono: ComponentProps<typeof Ionicons>['name'];
  titulo: string;
  descripcion: string;
};

// Resumen de lo que ofrece New You, mostrado antes del registro.
const FUNCIONALIDADES: Funcionalidad[] = [
  {
    icono: 'shirt-outline',
    titulo: 'Comprá ropa nueva y pre\u2011owned',
    descripcion: 'Explorá por categorías, filtrá por talle y mirá el stock disponible.',
  },
  {
    icono: 'pricetag-outline',
    titulo: 'Vendé tus prendas',
    descripcion: 'Publicá lo que ya no usás y gestioná tus ventas desde la app.',
  },
  {
    icono: 'storefront-outline',
    titulo: 'Tiendas y marcas locales',
    descripcion: 'Los comercios suman su tienda, sus sedes y administran su catálogo.',
  },
  {
    icono: 'cart-outline',
    titulo: 'Favoritos y carrito',
    descripcion: 'Guardá lo que te gusta y comprá todo junto en un solo checkout.',
  },
];

type Props = {
  visible: boolean;
  onCerrar: () => void;
};

// Tarjeta flotante que se cierra con la X y deja ver el login debajo.
export function TarjetaBienvenida({ visible, onCerrar }: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCerrar}>
      <View style={styles.fondo}>
        <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
          <View style={styles.tarjeta}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Cerrar bienvenida"
              hitSlop={10}
              style={styles.cerrar}
              onPress={onCerrar}>
              <Ionicons name="close" size={24} color={Colors.textMuted} />
            </Pressable>

            <Image source={BRANDING_LOGO} style={styles.logo} />

            <Text style={styles.titulo}>Bienvenido a New You</Text>
            <Text style={styles.subtitulo}>
              El marketplace de indumentaria que conecta a quienes compran con tiendas y personas que
              venden.
            </Text>

            <View style={styles.lista}>
              {FUNCIONALIDADES.map((item) => (
                <View key={item.titulo} style={styles.item}>
                  <View style={styles.icono}>
                    <Ionicons name={item.icono} size={22} color={Colors.primary} />
                  </View>
                  <View style={styles.itemTexto}>
                    <Text style={styles.itemTitulo}>{item.titulo}</Text>
                    <Text style={styles.itemDescripcion}>{item.descripcion}</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
          </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fondo: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
  },
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 48,
  },
  tarjeta: {
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 24,
    paddingVertical: 32,
    ...Shadow.card,
  },
  cerrar: {
    position: 'absolute',
    top: 14,
    right: 14,
    zIndex: 1,
  },
  logo: {
    width: 160,
    height: 80,
    resizeMode: 'contain',
    marginBottom: 16,
  },
  titulo: {
    color: Colors.primary,
    fontSize: 24,
    textAlign: 'center',
    fontFamily: 'Montserrat_700Bold',
  },
  subtitulo: {
    marginTop: 8,
    color: Colors.textMuted,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    fontFamily: 'Montserrat_400Regular',
  },
  lista: {
    width: '100%',
    gap: 16,
    marginTop: 28,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
  },
  icono: {
    width: 42,
    height: 42,
    borderRadius: Radius.full,
    backgroundColor: Colors.tertiary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemTexto: {
    flex: 1,
    gap: 2,
  },
  itemTitulo: {
    color: Colors.text,
    fontSize: 15,
    fontFamily: 'Montserrat_600SemiBold',
  },
  itemDescripcion: {
    color: Colors.textMuted,
    fontSize: 13,
    lineHeight: 18,
    fontFamily: 'Montserrat_400Regular',
  },
});
