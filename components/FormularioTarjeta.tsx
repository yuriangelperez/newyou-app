import { useState } from 'react';
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Colors, Radius, Spacing } from '../constants/theme';
import {
  calcularCuotas,
  DatosTarjeta,
  INTERES_CUOTAS,
  detectarMarca,
  formatearNumero,
  formatearVencimiento,
  largoCvv,
  soloDigitos,
  validarTarjeta,
} from '../utils/tarjeta';

interface FormularioTarjetaProps {
  visible: boolean;
  monto: number;
  tipo: 'credito' | 'debito';
  procesando: boolean;
  /** Cobra con la tarjeta; devuelve el motivo si no se pudo (null = pagado). */
  onPagar: (datos: DatosTarjeta) => Promise<string | null>;
  onCancelar: () => void;
}

const CUOTAS = Object.keys(INTERES_CUOTAS).map(Number);
const VACIO = { numero: '', titular: '', vencimiento: '', cvv: '', dni: '', cuotas: 1 };

const formatPrecio = (valor: number) => `$${Math.round(valor).toLocaleString('es-AR')}`;

/**
 * Formulario de tarjeta propio: valida en el celular y cobra con la Edge Function pago-tarjeta.
 * El checkout lo monta sólo mientras está abierto, así cada pago empieza vacío.
 */
export function FormularioTarjeta({ visible, monto, tipo, procesando, onPagar, onCancelar }: FormularioTarjetaProps) {
  const insets = useSafeAreaInsets();
  const [datos, setDatos] = useState<DatosTarjeta>(VACIO);
  const [intentado, setIntentado] = useState(false);
  // El aviso va dentro del formulario: un Toast quedaría tapado por el Modal.
  const [rechazo, setRechazo] = useState<string | null>(null);
  const [verPrueba, setVerPrueba] = useState(false);

  const marca = detectarMarca(datos.numero);
  // Débito siempre en 1 pago; en crédito el total suma el interés de las cuotas elegidas.
  const aPagar = calcularCuotas(monto, tipo === 'debito' ? 1 : datos.cuotas);
  const errores = validarTarjeta(datos, new Date(), tipo);
  // El tipo de tarjeta se avisa apenas se completa el número, sin esperar a "Pagar".
  const errorTipo = !intentado && errores.numero?.startsWith('Esta tarjeta es') ? errores.numero : null;
  const cambiar = (campo: keyof DatosTarjeta) => (valor: string) => {
    setRechazo(null);
    setDatos((previo) => ({ ...previo, [campo]: valor }));
  };

  const onSubmit = async () => {
    setIntentado(true);
    if (Object.keys(errores).length > 0 || procesando) {
      return;
    }
    const motivo = await onPagar({
      ...datos,
      numero: soloDigitos(datos.numero),
      cuotas: tipo === 'debito' ? 1 : datos.cuotas,
    });
    if (motivo) {
      // Por seguridad se borra el código; el resto queda para corregir. No se marca
      // como error: el motivo ya se muestra arriba del botón.
      setRechazo(motivo);
      setDatos((previo) => ({ ...previo, cvv: '' }));
      setIntentado(false);
    }
  };

  const error = (campo: keyof DatosTarjeta) =>
    intentado && errores[campo] ? <Text style={styles.error}>{errores[campo]}</Text> : null;

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onCancelar}>
      <View style={[styles.screen, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        <View style={styles.header}>
          <Text style={styles.titulo}>{tipo === 'credito' ? 'Tarjeta de crédito' : 'Tarjeta de débito'}</Text>
          <Pressable testID="tarjeta-cancelar" accessibilityRole="button" onPress={onCancelar} disabled={procesando}>
            <Text style={styles.cancelar}>Cancelar</Text>
          </Pressable>
        </View>

        <KeyboardAwareScrollView bottomOffset={24} contentContainerStyle={styles.contenido} keyboardShouldPersistTaps="handled">
          <View style={styles.tarjeta} testID="tarjeta-vista">
            <Text style={styles.tarjetaMarca}>{marca ?? 'TARJETA'}</Text>
            <Text style={styles.tarjetaNumero}>{formatearNumero(datos.numero) || '•••• •••• •••• ••••'}</Text>
            <View style={styles.tarjetaPie}>
              <Text style={styles.tarjetaTexto} numberOfLines={1}>
                {datos.titular.toUpperCase() || 'NOMBRE Y APELLIDO'}
              </Text>
              <Text style={styles.tarjetaTexto}>{datos.vencimiento || 'MM/AA'}</Text>
            </View>
          </View>

          <Text style={styles.label}>Número de tarjeta</Text>
          <TextInput
            testID="tarjeta-numero"
            style={[styles.input, intentado && errores.numero && styles.inputError]}
            value={formatearNumero(datos.numero)}
            onChangeText={(valor) => cambiar('numero')(soloDigitos(valor))}
            keyboardType="number-pad"
            placeholder="1234 5678 9012 3456"
            placeholderTextColor={Colors.textMuted}
            maxLength={23}
            autoComplete="cc-number"
          />
          {error('numero')}
          {errorTipo ? <Text style={styles.error}>{errorTipo}</Text> : null}

          <Text style={styles.label}>Nombre del titular</Text>
          <TextInput
            testID="tarjeta-titular"
            style={[styles.input, intentado && errores.titular && styles.inputError]}
            value={datos.titular}
            onChangeText={cambiar('titular')}
            autoCapitalize="characters"
            placeholder="Como figura en la tarjeta"
            placeholderTextColor={Colors.textMuted}
            autoComplete="name"
          />
          {error('titular')}

          <View style={styles.fila}>
            <View style={styles.columna}>
              <Text style={styles.label}>Vencimiento</Text>
              <TextInput
                testID="tarjeta-vencimiento"
                style={[styles.input, intentado && errores.vencimiento && styles.inputError]}
                value={datos.vencimiento}
                onChangeText={(valor) => cambiar('vencimiento')(formatearVencimiento(valor))}
                keyboardType="number-pad"
                placeholder="MM/AA"
                placeholderTextColor={Colors.textMuted}
                maxLength={5}
              />
              {error('vencimiento')}
            </View>
            <View style={styles.columna}>
              <Text style={styles.label}>Código de seguridad</Text>
              <TextInput
                testID="tarjeta-cvv"
                style={[styles.input, intentado && errores.cvv && styles.inputError]}
                value={datos.cvv}
                onChangeText={(valor) => cambiar('cvv')(soloDigitos(valor))}
                keyboardType="number-pad"
                placeholder={'•'.repeat(largoCvv(marca))}
                placeholderTextColor={Colors.textMuted}
                maxLength={largoCvv(marca)}
                secureTextEntry
              />
              {error('cvv')}
            </View>
          </View>

          <Text style={styles.label}>DNI del titular</Text>
          <TextInput
            testID="tarjeta-dni"
            style={[styles.input, intentado && errores.dni && styles.inputError]}
            value={datos.dni}
            onChangeText={(valor) => cambiar('dni')(soloDigitos(valor))}
            keyboardType="number-pad"
            placeholder="12345678"
            placeholderTextColor={Colors.textMuted}
            maxLength={8}
          />
          {error('dni')}

          {tipo === 'credito' ? (
            <>
              <Text style={styles.label}>Cuotas</Text>
              <View style={styles.cuotas}>
                {CUOTAS.map((cuotas) => {
                  const plan = calcularCuotas(monto, cuotas);
                  return (
                    <Pressable
                      key={cuotas}
                      testID={`tarjeta-cuotas-${cuotas}`}
                      accessibilityRole="radio"
                      accessibilityState={{ selected: datos.cuotas === cuotas }}
                      onPress={() => {
                        setRechazo(null);
                        setDatos((previo) => ({ ...previo, cuotas }));
                      }}
                      style={[styles.cuota, datos.cuotas === cuotas && styles.cuotaElegida]}>
                      <Text style={styles.cuotaTexto}>{cuotas === 1 ? '1 pago' : `${cuotas} cuotas de`}</Text>
                      <Text style={styles.cuotaMonto}>{formatPrecio(plan.valorCuota)}</Text>
                      <Text style={styles.cuotaInteres}>
                        {plan.interes === 0
                          ? 'Sin interés'
                          : `+${INTERES_CUOTAS[cuotas] * 100}% · total ${formatPrecio(plan.total)}`}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </>
          ) : null}

          {rechazo ? (
            <View style={styles.rechazo} testID="tarjeta-rechazo">
              <Text style={styles.rechazoTitulo}>No se pudo pagar</Text>
              <Text style={styles.rechazoTexto}>{rechazo}</Text>
            </View>
          ) : null}

          <Pressable
            testID="tarjeta-pagar"
            accessibilityRole="button"
            onPress={() => void onSubmit()}
            disabled={procesando}
            style={[styles.boton, procesando && styles.botonDeshabilitado]}>
            {procesando ? (
              <ActivityIndicator color={Colors.white} />
            ) : (
              <Text style={styles.botonTexto}>{`PAGAR ${formatPrecio(aPagar.total)}`}</Text>
            )}
          </Pressable>

          <Pressable accessibilityRole="button" onPress={() => setVerPrueba((v) => !v)}>
            <Text style={styles.enlace}>{verPrueba ? 'Ocultar tarjetas de prueba' : 'Ver tarjetas de prueba'}</Text>
          </Pressable>
          {verPrueba ? (
            <Text style={styles.ayuda}>
              {'Pago simulado, no se cobra nada.\n'}
              {'Crédito: 4509 9535 6623 3704 · 5031 7557 3453 0604\n'}
              {'Débito: 4002 7686 9439 5619 · 5287 3383 1025 3304\n'}
              {'Vencimiento futuro, código 123, DNI 12345678.\n'}
              {'Titular: APRO aprueba · FUND sin fondos · SECU código mal · CONT en revisión · OTHE rechaza.'}
            </Text>
          ) : null}
        </KeyboardAwareScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  titulo: { color: Colors.primary, fontSize: 18, fontFamily: 'Montserrat_500Medium' },
  cancelar: { color: Colors.secondary, fontSize: 15, fontFamily: 'Montserrat_700Bold' },
  contenido: { width: '100%', maxWidth: 520, alignSelf: 'center', padding: Spacing.md, paddingBottom: Spacing.xl },
  tarjeta: {
    backgroundColor: Colors.secondary,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    minHeight: 160,
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  tarjetaMarca: { color: Colors.white, fontSize: 16, fontFamily: 'Montserrat_700Bold', textAlign: 'right' },
  tarjetaNumero: { color: Colors.white, fontSize: 20, fontFamily: 'Montserrat_500Medium', letterSpacing: 1 },
  tarjetaPie: { flexDirection: 'row', justifyContent: 'space-between', columnGap: Spacing.sm },
  tarjetaTexto: { color: Colors.white, fontSize: 13, fontFamily: 'Montserrat_500Medium', flexShrink: 1 },
  label: { color: Colors.primary, fontSize: 14, fontFamily: 'Montserrat_500Medium', marginTop: Spacing.sm, marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: Colors.secondary,
    borderRadius: Radius.md,
    backgroundColor: Colors.surface,
    color: Colors.primary,
    paddingHorizontal: 12,
    minHeight: 46,
    fontSize: 15,
    fontFamily: 'Montserrat_400Regular',
  },
  inputError: { borderColor: Colors.danger },
  error: { color: Colors.danger, fontSize: 12, fontFamily: 'Montserrat_500Medium', marginTop: 4 },
  fila: { flexDirection: 'row', columnGap: Spacing.sm },
  columna: { flex: 1 },
  cuotas: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  cuota: {
    flexGrow: 1,
    flexBasis: '45%',
    borderWidth: 1,
    borderColor: Colors.secondary,
    borderRadius: Radius.md,
    backgroundColor: Colors.surface,
    padding: Spacing.sm,
    alignItems: 'center',
  },
  cuotaElegida: { backgroundColor: Colors.tertiary, borderColor: Colors.primary, borderWidth: 2 },
  cuotaTexto: { color: Colors.primary, fontSize: 13, fontFamily: 'Montserrat_500Medium' },
  cuotaMonto: { color: Colors.secondary, fontSize: 14, fontFamily: 'Montserrat_700Bold' },
  cuotaInteres: { color: Colors.textMuted, fontSize: 11, fontFamily: 'Montserrat_400Regular' },
  rechazo: {
    marginTop: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.dangerBorder,
    backgroundColor: Colors.dangerSoft,
    borderRadius: Radius.md,
    padding: Spacing.sm,
  },
  rechazoTitulo: { color: Colors.danger, fontSize: 14, fontFamily: 'Montserrat_700Bold' },
  rechazoTexto: { color: Colors.danger, fontSize: 13, fontFamily: 'Montserrat_500Medium', marginTop: 2 },
  boton: {
    marginTop: Spacing.lg,
    minHeight: 49,
    borderRadius: 10,
    backgroundColor: Colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  botonDeshabilitado: { opacity: 0.55 },
  botonTexto: { color: Colors.white, fontSize: 18, fontFamily: 'Montserrat_700Bold' },
  enlace: { color: Colors.secondary, fontSize: 13, fontFamily: 'Montserrat_500Medium', textAlign: 'center', marginTop: Spacing.md },
  ayuda: { color: Colors.textMuted, fontSize: 12, fontFamily: 'Montserrat_400Regular', marginTop: Spacing.sm, lineHeight: 18 },
});
