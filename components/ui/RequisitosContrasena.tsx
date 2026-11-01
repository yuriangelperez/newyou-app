import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { Colors } from '../../constants/theme';
import { REQUISITOS_CONTRASENA } from '../../schemas/authSchemas';

interface RequisitosContrasenaProps {
  contrasena: string;
  /** Si se pasa, agrega "Las contraseñas coinciden" a la lista. */
  repetir?: string;
}

/**
 * Lista de requisitos debajo del campo de contraseña. Se valida mientras se escribe:
 * en gris antes de empezar, en verde lo que se cumple y en rojo lo que falta.
 */
export function RequisitosContrasena({ contrasena, repetir }: RequisitosContrasenaProps) {
  const items: { id: string; texto: string; cumple: boolean; activo: boolean }[] =
    REQUISITOS_CONTRASENA.map((requisito) => ({
      id: requisito.id,
      texto: requisito.texto,
      cumple: requisito.cumple(contrasena),
      activo: contrasena.length > 0,
    }));

  if (repetir !== undefined) {
    items.push({
      id: 'coinciden',
      texto: 'Las contraseñas coinciden',
      cumple: repetir.length > 0 && repetir === contrasena,
      activo: repetir.length > 0,
    });
  }

  return (
    <View style={styles.lista} testID="requisitos-contrasena">
      {items.map((item) => {
        const color = !item.activo ? Colors.textMuted : item.cumple ? Colors.success : Colors.danger;
        const icono = !item.activo ? 'ellipse-outline' : item.cumple ? 'checkmark-circle' : 'close-circle';
        return (
          <View
            key={item.id}
            style={styles.fila}
            testID={`requisito-${item.id}`}
            accessibilityLabel={`${item.texto}: ${item.cumple ? 'cumplido' : 'pendiente'}`}>
            <Ionicons name={icono} size={16} color={color} />
            <Text style={[styles.texto, { color }]}>{item.texto}</Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  lista: {
    gap: 4,
    paddingLeft: 4,
  },
  fila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  texto: {
    fontSize: 13,
    fontFamily: 'Montserrat_500Medium',
  },
});
