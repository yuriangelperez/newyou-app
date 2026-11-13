// Mismo formulario que FormularioTarjeta.tsx (la web usa este archivo): mantenerlos iguales.
import { useState } from 'react';
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Colors, Radius, Spacing } from '../constants/theme';
import { MP_MODO_DEMO } from '../constants/demo';
import {
  calcularCuotas,
  DatosTarjeta,
  INTERES_CUOTAS,
  detectarMarca,
  detectarTipo,
  formatearNumero,
  formatearVencimiento,
  largoCvv,
  soloDigitos,
  TARJETAS_PRUEBA,
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

/**
 * Versión demo (EXPO_PUBLIC_MP_MODO=demo): la tarjeta se elige de la lista de prueba y los
 * datos vienen cargados y no se pueden editar, así nadie escribe una tarjeta real en la
 * presentación. El titular de prueba decide el resultado (ver pago-tarjeta).
 */
const RESULTADOS_DEMO = [
  { titular: 'APRO', etiqueta: 'Aprobado' },
  { titular: 'FUND', etiqueta: 'Sin fondos' },
  { titular: 'OTHE', etiqueta: 'Rechazado' },
];

function datosDePrueba(numero: string, titular = 'APRO'): DatosTarjeta {
  const amex = detectarMarca(numero) === 'American Express';
  return { numero, titular, vencimiento: '11/30', cvv: amex ? '1234' : '123', dni: '12345678', cuotas: 1 };
}

const formatPrecio = (valor: number) => `$${Math.round(valor).toLocaleString('es-AR')}`;

/**
 * Formulario de tarjeta propio: valida en el celular y cobra con la Edge Function pago-tarjeta.
 * El checkout lo monta sólo mientras está abierto, así cada pago empieza vacío.
 */
export function FormularioTarjeta({ visible, monto, tipo, procesando, onPagar, onCancelar }: FormularioTarjetaProps) {
  const insets = useSafeAreaInsets();
  const demo = MP_MODO_DEMO;
  const tarjetasDemo = TARJETAS_PRUEBA.filter((tarjeta) => tarjeta.tipo === tipo);
  const [datos, setDatos] = useState<DatosTarjeta>(() =>
    demo && tarjetasDemo[0] ? datosDePrueba(tarjetasDemo[0].numero) : VACIO,
  );
  const [intentado, setIntentado] = useState(false);
  // El aviso va dentro del formulario: un Toast quedaría tapado por el Modal.
  const [rechazo, setRechazo] = useState<string | null>(null);
  const [verPrueba, setVerPrueba] = useState(false);

  const marca = detectarMarca(datos.numero);
  // Débito siempre en 1 pago; en crédito el total suma el interés de las cuotas elegidas.
  const aPagar = calcularCuotas(monto, tipo === 'debito' ? 1 : datos.cuotas);
  const errores = validarTarjeta(datos, new Date(), tipo);
  // Apenas se completa el número se avisa si es inválido o si es de débito/crédito
  // (TC-PAGO-06), sin esperar a "Pagar".
  const digitos = soloDigitos(datos.numero);
  const numeroCompleto = digitos.length >= (marca === 'American Express' ? 15 : 16);
  const errorTipo = !intentado && numeroCompleto && errores.numero ? errores.numero : null;
  const tipoDetectado = numeroCompleto && !errores.numero ? detectarTipo(digitos) : null;
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
      // En la demo el código viene fijo y no se puede volver a escribir: no se borra.
      if (!demo) {
        setDatos((previo) => ({ ...previo, cvv: '' }));
      }
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

          {demo ? (
            <View testID="tarjeta-demo">
              <View style={styles.avisoDemo}>
                <Text style={styles.avisoDemoTexto}>
                  Versión demo: elegí una tarjeta de prueba. Los datos vienen cargados y no se cobra nada. No uses una
                  tarjeta real.
                </Text>
              </View>
              <Text style={styles.label}>Tarjeta de prueba</Text>
              <View style={styles.opciones}>
                {tarjetasDemo.map((tarjeta) => {
                  const elegida = datos.numero === tarjeta.numero;
                  return (
                    <Pressable
                      key={tarjeta.numero}
                      testID={`tarjeta-demo-${tarjeta.numero.slice(-4)}`}
                      accessibilityRole="radio"
                      accessibilityState={{ selected: elegida }}
                      disabled={procesando}
                      onPress={() => {
                        setRechazo(null);
                        setDatos((previo) => ({ ...datosDePrueba(tarjeta.numero, previo.titular), cuotas: previo.cuotas }));
                      }}
                      style={[styles.opcion, elegida && styles.opcionElegida]}>
                      <Text style={styles.opcionTexto}>{`${tarjeta.marca} •••• ${tarjeta.numero.slice(-4)}`}</Text>
                    </Pressable>
                  );
                })}
              </View>
              <Text style={styles.label}>Resultado del pago</Text>
              <View style={styles.opciones}>
                {RESULTADOS_DEMO.map((opcion) => {
                  const elegida = datos.titular === opcion.titular;
                  return (
                    <Pressable
                      key={opcion.titular}
                      testID={`tarjeta-demo-resultado-${opcion.titular}`}
                      accessibilityRole="radio"
                      accessibilityState={{ selected: elegida }}
                      disabled={procesando}
                      onPress={() => {
                        setRechazo(null);
                        setDatos((previo) => ({ ...previo, titular: opcion.titular }));
                      }}
                      style={[styles.opcion, elegida && styles.opcionElegida]}>
                      <Text style={styles.opcionTexto}>{opcion.etiqueta}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ) : null}

          <Text style={styles.label}>Número de tarjeta</Text>
          <TextInput
            testID="tarjeta-numero"
            editable={!demo}
            style={[styles.input, intentado && errores.numero && styles.inputError, demo && styles.inputFijo]}
            // Sólo dígitos en el campo: reformatear con espacios mientras se escribe movía
            // el cursor en Android y desordenaba el número. Con espacios se ve en la tarjeta de arriba.
            value={datos.numero}
            onChangeText={(valor) => cambiar('numero')(soloDigitos(valor).slice(0, 19))}
            keyboardType="number-pad"
            placeholder="1234 5678 9012 3456"
            placeholderTextColor={Colors.textMuted}
            maxLength={19}
            autoComplete="cc-number"
          />
          {error('numero')}
          {errorTipo ? <Text style={styles.error} testID="tarjeta-aviso-numero">{errorTipo}</Text> : null}
          {tipoDetectado ? (
            <Text style={styles.ok} testID="tarjeta-tipo-detectado">
              {`${marca} ${tipoDetectado === 'debito' ? 'débito' : 'crédito'} ✓`}
            </Text>
          ) : null}

          <Text style={styles.label}>Nombre del titular</Text>
          <TextInput
            testID="tarjeta-titular"
            editable={!demo}
            style={[styles.input, intentado && errores.titular && styles.inputError, demo && styles.inputFijo]}
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
                editable={!demo}
                style={[styles.input, intentado && errores.vencimiento && styles.inputError, demo && styles.inputFijo]}
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
                editable={!demo}
                style={[styles.input, intentado && errores.cvv && styles.inputError, demo && styles.inputFijo]}
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
            editable={!demo}
            style={[styles.input, intentado && errores.dni && styles.inputError, demo && styles.inputFijo]}
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

          {demo ? null : (
          <Pressable accessibilityRole="button" onPress={() => setVerPrueba((v) => !v)}>
            <Text style={styles.enlace}>{verPrueba ? 'Ocultar tarjetas de prueba' : 'Ver tarjetas de prueba'}</Text>
          </Pressable>
          )}
          {verPrueba && !demo ? (
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
  // Demo: datos fijos, se ven pero no se editan.
  inputFijo: { backgroundColor: Colors.backgroundMuted, color: Colors.textMuted },
  avisoDemo: {
    borderWidth: 1,
    borderColor: Colors.secondary,
    backgroundColor: Colors.accentSoft,
    borderRadius: Radius.md,
    padding: Spacing.sm,
  },
  avisoDemoTexto: { color: Colors.textStrong, fontSize: 13, fontFamily: 'Montserrat_500Medium' },
  opciones: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  opcion: {
    borderWidth: 1,
    borderColor: Colors.secondary,
    borderRadius: Radius.md,
    backgroundColor: Colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  opcionElegida: { backgroundColor: Colors.tertiary, borderColor: Colors.primary, borderWidth: 2 },
  opcionTexto: { color: Colors.primary, fontSize: 13, fontFamily: 'Montserrat_500Medium' },
  error: { color: Colors.danger, fontSize: 12, fontFamily: 'Montserrat_500Medium', marginTop: 4 },
  ok: { color: Colors.success, fontSize: 12, fontFamily: 'Montserrat_600SemiBold', marginTop: 4 },
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
