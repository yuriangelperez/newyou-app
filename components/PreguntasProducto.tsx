import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import Toast from 'react-native-toast-message';

import { Colors, FontSize, Radius, Spacing } from '../constants/theme';
import {
  hacerPregunta,
  listarPreguntas,
  ocultarPregunta,
  Pregunta,
  responderPregunta,
} from '../services/preguntasService';
import { AVISO_DATOS_CONTACTO, contieneDatosContacto } from '../utils/contacto';

const VISIBLES_AL_INICIO = 5;
const MAX_PREGUNTA = 300;
const MAX_RESPUESTA = 500;

const fechaCorta = (iso: string) =>
  new Date(iso).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });

/**
 * Preguntas públicas de una prenda. El comprador pregunta; el vendedor (o quien tenga
 * preguntas.responder en la empresa) responde u oculta. Sin teléfonos, mails ni links.
 */
export function PreguntasProducto({
  productoId,
  puedeResponder,
}: {
  productoId: string;
  /** El usuario es quien vende esta prenda: responde en vez de preguntar. */
  puedeResponder: boolean;
}) {
  const [preguntas, setPreguntas] = useState<Pregunta[] | null>(null);
  const [verTodas, setVerTodas] = useState(false);
  const [texto, setTexto] = useState('');
  const [errorTexto, setErrorTexto] = useState('');
  const [enviando, setEnviando] = useState(false);

  const cargar = useCallback(() => {
    listarPreguntas(productoId)
      .then(setPreguntas)
      .catch(() => setPreguntas([]));
  }, [productoId]);

  useEffect(cargar, [cargar]);

  const onPreguntar = async () => {
    const limpio = texto.trim();
    if (limpio.length < 3) {
      setErrorTexto('Escribí tu pregunta (mínimo 3 caracteres).');
      return;
    }
    if (contieneDatosContacto(limpio)) {
      setErrorTexto(AVISO_DATOS_CONTACTO);
      return;
    }
    try {
      setEnviando(true);
      const nueva = await hacerPregunta(productoId, limpio);
      setPreguntas((actuales) => [nueva, ...(actuales ?? [])]);
      setTexto('');
      setErrorTexto('');
      Toast.show({ type: 'success', text1: 'Pregunta enviada', text2: 'Te avisamos cuando el vendedor responda.' });
    } catch (error) {
      setErrorTexto(error instanceof Error ? error.message : 'No se pudo enviar la pregunta.');
    } finally {
      setEnviando(false);
    }
  };

  const actualizar = (pregunta: Pregunta) =>
    setPreguntas((actuales) => (actuales ?? []).map((item) => (item.id === pregunta.id ? pregunta : item)));

  if (preguntas === null) {
    return (
      <View style={styles.contenedor}>
        <Text style={styles.titulo}>PREGUNTAS</Text>
        <ActivityIndicator color={Colors.secondary} />
      </View>
    );
  }

  const visibles = verTodas ? preguntas : preguntas.slice(0, VISIBLES_AL_INICIO);

  return (
    <View style={styles.contenedor} testID="preguntas-producto">
      <Text style={styles.titulo}>PREGUNTAS</Text>

      {!puedeResponder ? (
        <View style={styles.formulario}>
          <TextInput
            testID="preguntas-input"
            style={styles.input}
            value={texto}
            onChangeText={(valor) => {
              setTexto(valor);
              setErrorTexto('');
            }}
            placeholder="Preguntale al vendedor (talle, medidas, estado...)"
            placeholderTextColor={Colors.textMuted}
            maxLength={MAX_PREGUNTA}
            multiline
          />
          {errorTexto ? <Text style={styles.error}>{errorTexto}</Text> : null}
          <Pressable
            testID="preguntas-enviar"
            accessibilityRole="button"
            onPress={() => void onPreguntar()}
            disabled={enviando}
            style={[styles.boton, enviando && styles.botonDeshabilitado]}
          >
            <Text style={styles.botonTexto}>{enviando ? 'ENVIANDO...' : 'PREGUNTAR'}</Text>
          </Pressable>
        </View>
      ) : null}

      {preguntas.length === 0 ? (
        <Text style={styles.vacio}>
          {puedeResponder ? 'Todavía no te hicieron preguntas.' : 'Nadie preguntó todavía. ¡Hacé la primera pregunta!'}
        </Text>
      ) : null}

      {visibles.map((pregunta) => (
        <ItemPregunta
          key={pregunta.id}
          pregunta={pregunta}
          puedeResponder={puedeResponder}
          onCambio={actualizar}
        />
      ))}

      {preguntas.length > VISIBLES_AL_INICIO ? (
        <Pressable onPress={() => setVerTodas((valor) => !valor)} accessibilityRole="button">
          <Text style={styles.enlace}>
            {verTodas ? 'Ver menos' : `Ver todas las preguntas (${preguntas.length})`}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function ItemPregunta({
  pregunta,
  puedeResponder,
  onCambio,
}: {
  pregunta: Pregunta;
  puedeResponder: boolean;
  onCambio: (pregunta: Pregunta) => void;
}) {
  const [respuesta, setRespuesta] = useState('');
  const [error, setError] = useState('');
  const [guardando, setGuardando] = useState(false);

  const onResponder = async () => {
    const limpio = respuesta.trim();
    if (!limpio) {
      setError('Escribí la respuesta.');
      return;
    }
    if (contieneDatosContacto(limpio)) {
      setError(AVISO_DATOS_CONTACTO);
      return;
    }
    try {
      setGuardando(true);
      onCambio(await responderPregunta(pregunta.id, limpio));
      setRespuesta('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo responder.');
    } finally {
      setGuardando(false);
    }
  };

  const onOcultar = async () => {
    try {
      await ocultarPregunta(pregunta.id, !pregunta.oculta);
      onCambio({ ...pregunta, oculta: !pregunta.oculta });
    } catch (e) {
      Toast.show({ type: 'error', text1: e instanceof Error ? e.message : 'No se pudo ocultar.' });
    }
  };

  return (
    <View style={[styles.item, pregunta.oculta && styles.itemOculto]} testID={`pregunta-${pregunta.id}`}>
      <Text style={styles.pregunta}>{pregunta.texto}</Text>
      {pregunta.respuesta ? (
        <Text style={styles.respuesta}>
          {`↳ ${pregunta.respuesta}`}
          <Text style={styles.fecha}>{`  ${fechaCorta(pregunta.respondidaAt ?? pregunta.createdAt)}`}</Text>
        </Text>
      ) : (
        <Text style={styles.fecha}>{`Sin responder · ${fechaCorta(pregunta.createdAt)}`}</Text>
      )}
      {pregunta.oculta ? <Text style={styles.fecha}>Oculta para los demás</Text> : null}

      {puedeResponder ? (
        <View style={styles.accionesVendedor}>
          {!pregunta.respuesta ? (
            <>
              <TextInput
                testID={`responder-input-${pregunta.id}`}
                style={styles.input}
                value={respuesta}
                onChangeText={(valor) => {
                  setRespuesta(valor);
                  setError('');
                }}
                placeholder="Escribí tu respuesta"
                placeholderTextColor={Colors.textMuted}
                maxLength={MAX_RESPUESTA}
                multiline
              />
              {error ? <Text style={styles.error}>{error}</Text> : null}
            </>
          ) : null}
          <View style={styles.filaBotones}>
            {!pregunta.respuesta ? (
              <Pressable
                testID={`responder-enviar-${pregunta.id}`}
                onPress={() => void onResponder()}
                disabled={guardando}
                style={[styles.botonChico, guardando && styles.botonDeshabilitado]}
              >
                <Text style={styles.botonTexto}>{guardando ? '...' : 'RESPONDER'}</Text>
              </Pressable>
            ) : null}
            <Pressable onPress={() => void onOcultar()} accessibilityRole="button">
              <Text style={styles.enlace}>{pregunta.oculta ? 'Mostrar' : 'Ocultar'}</Text>
            </Pressable>
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: { marginTop: Spacing.lg, gap: Spacing.sm },
  titulo: { color: Colors.text, fontSize: FontSize.lg, fontFamily: 'Montserrat_700Bold' },
  formulario: { gap: Spacing.xs },
  input: {
    minHeight: 44,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    backgroundColor: Colors.surface,
    color: Colors.text,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    fontSize: FontSize.md,
    textAlignVertical: 'top',
  },
  error: { color: Colors.danger, fontSize: FontSize.sm },
  boton: {
    alignSelf: 'flex-end',
    backgroundColor: Colors.primary,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    minHeight: 40,
    justifyContent: 'center',
  },
  botonChico: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.sm,
    minHeight: 34,
    justifyContent: 'center',
  },
  botonDeshabilitado: { opacity: 0.5 },
  botonTexto: { color: Colors.background, fontSize: FontSize.sm, fontFamily: 'Montserrat_700Bold' },
  vacio: { color: Colors.textMuted, fontSize: FontSize.md },
  item: {
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: Spacing.sm,
    gap: Spacing.xs,
  },
  itemOculto: { opacity: 0.55 },
  pregunta: { color: Colors.text, fontSize: FontSize.md, fontFamily: 'Montserrat_500Medium' },
  respuesta: { color: Colors.text, fontSize: FontSize.md, paddingLeft: Spacing.sm },
  fecha: { color: Colors.textMuted, fontSize: FontSize.xs },
  accionesVendedor: { gap: Spacing.xs },
  filaBotones: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  enlace: { color: Colors.secondary, fontSize: FontSize.sm, textDecorationLine: 'underline' },
});
