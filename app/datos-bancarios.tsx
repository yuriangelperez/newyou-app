import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';

import { EncabezadoPantalla } from '../components/ui/EncabezadoPantalla';
import { Colors, FontSize, Radius, Spacing } from '../constants/theme';
import { cuitValido } from '../services/empresasService';
import { guardarDatosBancarios, obtenerDatosBancarios } from '../services/liquidacionesService';
import { puede, selectEmpresaActiva, useEmpresaStore } from '../stores/useEmpresaStore';
import { useUsuarioStore } from '../stores/useUsuarioStore';
import { aliasValido, cbuValido } from '../utils/cbu';

/**
 * Cuenta donde New You deposita las liquidaciones semanales. Con una empresa activa es
 * la cuenta de la empresa (sólo propietario o administrador, mismo CUIT); si no, la del particular.
 */
export default function DatosBancariosScreen() {
  const insets = useSafeAreaInsets();
  const usuarioId = useUsuarioStore((state) => state.usuario?.id ?? '');
  const empresaActiva = useEmpresaStore(selectEmpresaActiva);
  const empresaId = empresaActiva?.empresaId ?? null;
  const puedeEditar = !empresaActiva || puede(empresaActiva, 'empresa.editar');

  const [cargando, setCargando] = useState(true);
  const [titular, setTitular] = useState('');
  const [cuit, setCuit] = useState('');
  const [cbu, setCbu] = useState('');
  const [alias, setAlias] = useState('');
  const [banco, setBanco] = useState('');
  const [retenerHasta, setRetenerHasta] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    if (!usuarioId) {
      return;
    }
    obtenerDatosBancarios({ empresaId, usuarioId })
      .then((datos) => {
        if (datos) {
          setTitular(datos.titular);
          setCuit(datos.cuit);
          setCbu(datos.cbu);
          setAlias(datos.alias ?? '');
          setBanco(datos.banco ?? '');
          setRetenerHasta(datos.retenerHasta);
        }
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'No se pudieron cargar los datos.'))
      .finally(() => setCargando(false));
  }, [empresaId, usuarioId]);

  const onGuardar = async () => {
    if (titular.trim().length < 3) return setError('Ingresá el nombre del titular de la cuenta.');
    if (!cuitValido(cuit)) return setError('El CUIT/CUIL no es válido.');
    if (!cbuValido(cbu)) return setError('El CBU/CVU no es válido. Revisá los 22 números.');
    if (banco.trim().length < 2) return setError('Indicá el banco o la billetera virtual de la cuenta.');
    if (alias.trim() && !aliasValido(alias)) return setError('El alias tiene que tener entre 6 y 20 caracteres, sin espacios.');
    try {
      setGuardando(true);
      setError('');
      const datos = await guardarDatosBancarios(empresaId, { titular, cuit, cbu, alias, banco });
      setRetenerHasta(datos.retenerHasta);
      Toast.show({ type: 'success', text1: 'Datos bancarios guardados' });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudieron guardar.');
    } finally {
      setGuardando(false);
    }
  };

  const retenida = retenerHasta && new Date(retenerHasta) > new Date();

  return (
    <View style={styles.screen}>
      <EncabezadoPantalla titulo="DATOS BANCARIOS" />
      <KeyboardAwareScrollView
        bottomOffset={24}
        contentContainerStyle={[styles.contenido, { paddingBottom: insets.bottom + Spacing.xl }]}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.aviso}>
          {empresaActiva
            ? `New You deposita cada semana lo cobrado por ${empresaActiva.nombre}. La cuenta tiene que estar a nombre de la empresa (mismo CUIT).`
            : 'New You te deposita cada semana lo cobrado con tarjeta y Mercado Pago, menos la comisión y los cargos. La cuenta tiene que estar a tu nombre.'}
        </Text>
        {retenida ? (
          <Text style={styles.retenida}>
            {`Cambiaste la cuenta: por seguridad los pagos quedan frenados hasta el ${new Date(retenerHasta).toLocaleString('es-AR')}.`}
          </Text>
        ) : null}

        {cargando ? <ActivityIndicator color={Colors.primary} /> : null}
        {!cargando && !puedeEditar ? (
          <Text style={styles.aviso}>Sólo el propietario o un administrador de la empresa puede ver y cambiar la cuenta.</Text>
        ) : null}

        {!cargando && puedeEditar ? (
          <View style={styles.formulario}>
            <Campo etiqueta="Titular de la cuenta" valor={titular} onCambio={setTitular} testID="banco-titular" />
            <Campo etiqueta="CUIT / CUIL" valor={cuit} onCambio={setCuit} teclado="number-pad" testID="banco-cuit" maximo={13} />
            <Campo etiqueta="CBU / CVU (22 números)" valor={cbu} onCambio={setCbu} teclado="number-pad" testID="banco-cbu" maximo={26} />
            <Campo etiqueta="Alias (opcional)" valor={alias} onCambio={setAlias} testID="banco-alias" maximo={20} />
            <Campo etiqueta="Banco o billetera virtual" valor={banco} onCambio={setBanco} testID="banco-nombre" />
            {error ? <Text style={styles.error}>{error}</Text> : null}
            <Pressable
              testID="banco-guardar"
              accessibilityRole="button"
              onPress={() => void onGuardar()}
              disabled={guardando}
              style={[styles.boton, guardando && styles.deshabilitado]}
            >
              <Text style={styles.botonTexto}>{guardando ? 'GUARDANDO...' : 'GUARDAR'}</Text>
            </Pressable>
            <Text style={styles.ayuda}>
              Si cambiás el CBU te avisamos y frenamos los pagos 48 horas, para que nadie pueda desviar tu plata.
            </Text>
          </View>
        ) : null}
      </KeyboardAwareScrollView>
    </View>
  );
}

function Campo({
  etiqueta,
  valor,
  onCambio,
  teclado,
  testID,
  maximo,
}: {
  etiqueta: string;
  valor: string;
  onCambio: (valor: string) => void;
  teclado?: 'number-pad';
  testID: string;
  maximo?: number;
}) {
  return (
    <View style={styles.campo}>
      <Text style={styles.etiqueta}>{etiqueta}</Text>
      <TextInput
        testID={testID}
        style={styles.input}
        value={valor}
        onChangeText={onCambio}
        keyboardType={teclado}
        maxLength={maximo}
        autoCapitalize={teclado ? 'none' : 'words'}
        autoCorrect={false}
        placeholderTextColor={Colors.textMuted}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  contenido: { width: '100%', maxWidth: 600, alignSelf: 'center', padding: Spacing.md, gap: Spacing.md },
  aviso: { color: Colors.textMuted, fontSize: FontSize.md },
  retenida: {
    color: Colors.warning,
    fontSize: FontSize.md,
    fontWeight: '600',
    backgroundColor: Colors.surface,
    padding: Spacing.sm,
    borderRadius: Radius.md,
  },
  formulario: { gap: Spacing.sm },
  campo: { gap: 4 },
  etiqueta: { color: Colors.text, fontSize: FontSize.sm, fontWeight: '600' },
  input: {
    minHeight: 44,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    backgroundColor: Colors.surface,
    color: Colors.text,
    paddingHorizontal: Spacing.sm,
    fontSize: FontSize.md,
  },
  error: { color: Colors.danger, fontSize: FontSize.sm },
  boton: { backgroundColor: Colors.primary, borderRadius: Radius.md, minHeight: 46, alignItems: 'center', justifyContent: 'center' },
  deshabilitado: { opacity: 0.5 },
  botonTexto: { color: Colors.background, fontWeight: '700', fontSize: FontSize.md },
  ayuda: { color: Colors.textMuted, fontSize: FontSize.xs },
});
