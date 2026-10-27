import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { ActivityIndicator, Pressable, Text, TextInput, View } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import Toast from "react-native-toast-message";

import { EncabezadoPantalla } from "../components/ui/EncabezadoPantalla";
import { estilosFormulario as styles } from "../constants/estilosFormulario";
import { Colors } from "../constants/theme";
import { PerfilForm, perfilSchema, USUARIO_MAX } from "../schemas/authSchemas";
import { traducirError } from "../services/erroresSupabase";
import { actualizarPerfil } from "../services/perfilService";
import { supabase } from "../services/supabase";
import { useUsuarioStore } from "../stores/useUsuarioStore";

/** Editar los datos del perfil (HU18): nombre de usuario y correo. */
export default function EditarPerfilScreen() {
  const router = useRouter();
  const usuario = useUsuarioStore((state) => state.usuario);
  const hidratarDesdeAuthUser = useUsuarioStore((state) => state.hidratarDesdeAuthUser);
  const [errorServidor, setErrorServidor] = useState("");

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<PerfilForm>({
    resolver: zodResolver(perfilSchema),
    defaultValues: { usuario: usuario?.nombre ?? "", correo: usuario?.email ?? "" },
  });

  const onGuardar = handleSubmit(async (datos) => {
    setErrorServidor("");
    try {
      const { correoPendiente } = await actualizarPerfil(datos);
      const { data } = await supabase.auth.getUser();
      await hidratarDesdeAuthUser(data.user ?? null);

      Toast.show({
        type: "success",
        text1: "Perfil actualizado",
        text2: correoPendiente
          ? "Te mandamos un enlace al correo nuevo: el cambio se aplica cuando lo confirmes."
          : "Los cambios se guardaron.",
      });
      router.back();
    } catch (error) {
      setErrorServidor(traducirError(error));
    }
  });

  return (
    <View style={styles.screen}>
      <EncabezadoPantalla titulo="EDITAR PERFIL" />
      <KeyboardAwareScrollView bottomOffset={24} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.card}>
          <Text style={styles.label}>Nombre de usuario</Text>
          <Controller
            control={control}
            name="usuario"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                testID="perfil-usuario"
                value={value}
                onBlur={onBlur}
                onChangeText={(texto) => {
                  onChange(texto);
                  setErrorServidor("");
                }}
                maxLength={USUARIO_MAX}
                autoCapitalize="none"
                autoCorrect={false}
                style={styles.input}
                placeholderTextColor={Colors.textMuted}
              />
            )}
          />
          {errors.usuario ? <Text style={styles.error}>{errors.usuario.message}</Text> : null}
          <Text style={styles.muted}>Hasta {USUARIO_MAX} caracteres: letras, números y espacios entre palabras.</Text>

          <Text style={styles.label}>Correo</Text>
          <Controller
            control={control}
            name="correo"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                testID="perfil-correo"
                value={value}
                onBlur={onBlur}
                onChangeText={(texto) => {
                  onChange(texto);
                  setErrorServidor("");
                }}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                style={styles.input}
                placeholderTextColor={Colors.textMuted}
              />
            )}
          />
          {errors.correo ? <Text style={styles.error}>{errors.correo.message}</Text> : null}
          <Text style={styles.muted}>Si lo cambiás, vas a tener que confirmar el correo nuevo.</Text>

          {errorServidor ? <Text style={styles.error}>{errorServidor}</Text> : null}

          <Pressable
            testID="perfil-guardar"
            disabled={isSubmitting || !isDirty}
            onPress={() => void onGuardar()}
            style={[styles.saveButton, (isSubmitting || !isDirty) && styles.disabled]}>
            {isSubmitting ? <ActivityIndicator color={Colors.white} /> : <Text style={styles.saveText}>Guardar cambios</Text>}
          </Pressable>
        </View>
      </KeyboardAwareScrollView>
    </View>
  );
}
