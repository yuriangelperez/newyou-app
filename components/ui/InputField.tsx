import { Controller } from 'react-hook-form';
import { StyleSheet, Text, TextInput, TextInputProps, View } from 'react-native';

import { Colors, Radius } from '../../constants/theme';

interface InputFieldProps {
  control: any;
  name: string;
  label: string;
  placeholder?: string;
  textInputProps?: TextInputProps;
}

export function InputField({
  control,
  name,
  label,
  placeholder,
  textInputProps,
}: InputFieldProps) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field: { onBlur, onChange, value }, fieldState: { error } }) => (
        <View style={styles.wrapper}>
          <Text style={styles.label}>{label}</Text>
          <TextInput
            style={[styles.input, error && styles.inputError]}
            placeholder={placeholder}
            placeholderTextColor={Colors.textMuted}
            value={value === undefined || value === null ? '' : String(value)}
            onChangeText={onChange}
            onBlur={onBlur}
            {...textInputProps}
          />
          {error ? <Text style={styles.errorText}>{error.message}</Text> : null}
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  wrapper: {
    rowGap: 6,
    marginBottom: 14,
  },
  label: {
    color: Colors.primary,
    fontSize: 14,
    fontFamily: 'Montserrat_600SemiBold',
  },
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    backgroundColor: Colors.surface,
    color: Colors.text,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontFamily: 'Montserrat_400Regular',
    fontSize: 15,
  },
  inputError: {
    borderColor: Colors.danger,
  },
  errorText: {
    color: Colors.danger,
    fontSize: 12,
    fontFamily: 'Montserrat_500Medium',
  },
});
