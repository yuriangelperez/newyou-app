import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Colors, Radius } from '../../constants/theme';
import { fechaISO } from '../../utils/rangoFechas';

const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
const DIAS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

interface CalendarioRangoProps {
  /** Rango marcado ("AAAA-MM-DD"). */
  desde: string;
  hasta: string;
  /** Último día que se puede elegir (hoy); los posteriores quedan apagados. */
  maximo: string;
  onElegir: (iso: string) => void;
}

/** Celdas del mes: huecos (null) hasta el lunes y después los días como "AAAA-MM-DD". */
function celdasDelMes(anio: number, mes: number): (string | null)[] {
  const primero = new Date(anio, mes, 1);
  const huecos = (primero.getDay() + 6) % 7; // la semana arranca el lunes
  const dias = new Date(anio, mes + 1, 0).getDate();
  const celdas: (string | null)[] = Array(huecos).fill(null);
  for (let dia = 1; dia <= dias; dia++) celdas.push(fechaISO(new Date(anio, mes, dia)));
  return celdas;
}

/** Calendario de un mes, sin librerías: sirve igual en Expo Go y en la web. */
export function CalendarioRango({ desde, hasta, maximo, onElegir }: CalendarioRangoProps) {
  const [anio, mesBase] = (hasta || desde || maximo).split('-').map(Number);
  const [visible, setVisible] = useState({ anio, mes: mesBase - 1 });

  const mover = (delta: number) => {
    const fecha = new Date(visible.anio, visible.mes + delta, 1);
    setVisible({ anio: fecha.getFullYear(), mes: fecha.getMonth() });
  };
  const [anioMax, mesMax] = maximo.split('-').map(Number);
  const esUltimoMes = visible.anio > anioMax || (visible.anio === anioMax && visible.mes + 1 >= mesMax);

  return (
    <View style={styles.contenedor} testID="calendario-rango">
      <View style={styles.encabezado}>
        <Pressable testID="calendario-anterior" accessibilityLabel="Mes anterior" hitSlop={8} onPress={() => mover(-1)}>
          <Ionicons name="chevron-back" size={20} color={Colors.primary} />
        </Pressable>
        <Text style={styles.titulo}>{`${MESES[visible.mes]} ${visible.anio}`}</Text>
        <Pressable
          testID="calendario-siguiente"
          accessibilityLabel="Mes siguiente"
          hitSlop={8}
          disabled={esUltimoMes}
          onPress={() => mover(1)}>
          <Ionicons name="chevron-forward" size={20} color={esUltimoMes ? Colors.border : Colors.primary} />
        </Pressable>
      </View>

      <View style={styles.semana}>
        {DIAS.map((dia, i) => (
          <Text key={i} style={styles.diaSemana}>{dia}</Text>
        ))}
      </View>

      <View style={styles.grilla}>
        {celdasDelMes(visible.anio, visible.mes).map((iso, i) => {
          if (!iso) return <View key={`hueco-${i}`} style={styles.celda} />;
          const futuro = iso > maximo;
          const extremo = iso === desde || iso === hasta;
          const dentro = iso > desde && iso < hasta;
          return (
            <View key={iso} style={[styles.celda, dentro && styles.celdaDentro]}>
              <Pressable
                testID={`dia-${iso}`}
                accessibilityRole="button"
                accessibilityState={{ selected: extremo, disabled: futuro }}
                disabled={futuro}
                onPress={() => onElegir(iso)}
                style={[styles.dia, extremo && styles.diaElegido]}>
                <Text style={[styles.diaTexto, futuro && styles.diaApagado, extremo && styles.diaTextoElegido]}>
                  {Number(iso.slice(8))}
                </Text>
              </Pressable>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: {
    borderWidth: 1,
    borderColor: Colors.tertiary,
    borderRadius: Radius.md,
    backgroundColor: Colors.surface,
    padding: 10,
  },
  encabezado: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 8 },
  titulo: { color: Colors.primary, fontSize: 15, fontFamily: 'Montserrat_700Bold' },
  semana: { flexDirection: 'row' },
  diaSemana: {
    width: `${100 / 7}%`,
    textAlign: 'center',
    color: Colors.textEarthMuted,
    fontSize: 12,
    fontFamily: 'Montserrat_600SemiBold',
    paddingBottom: 4,
  },
  grilla: { flexDirection: 'row', flexWrap: 'wrap' },
  celda: { width: `${100 / 7}%`, height: 38, alignItems: 'center', justifyContent: 'center' },
  celdaDentro: { backgroundColor: Colors.accentSoft },
  dia: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  diaElegido: { backgroundColor: Colors.secondary },
  diaTexto: { color: Colors.text, fontSize: 13, fontFamily: 'Montserrat_500Medium' },
  diaApagado: { color: Colors.border },
  diaTextoElegido: { color: Colors.white, fontFamily: 'Montserrat_700Bold' },
});
