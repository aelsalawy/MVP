import React, { useState, forwardRef } from 'react';
import {
  TextInput,
  StyleSheet,
  View,
  Text,
  TextInputProps,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { colors, radius, spacing, typography } from './theme';

export interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  helperText?: string;
  containerStyle?: ViewStyle;
  labelStyle?: TextStyle;
  inputStyle?: TextStyle;
}

export const Input = forwardRef<TextInput, InputProps>(
  (
    {
      label,
      error,
      helperText,
      containerStyle,
      labelStyle,
      inputStyle,
      secureTextEntry,
      ...props
    },
    ref
  ) => {
    const [isFocused, setIsFocused] = useState(false);

    return (
      <View style={[styles.container, containerStyle]}>
        {label && (
          <Text
            style={[
              styles.label,
              {
                color: isFocused ? colors.primary[400] : colors.text.secondary,
              },
              labelStyle,
            ]}
          >
            {label}
          </Text>
        )}
        <View
          style={[
            styles.inputContainer,
            {
              borderColor: error ? colors.border.error : isFocused ? colors.border.focused : colors.border.default,
              backgroundColor: colors.background.surface,
            },
          ]}
        >
          <TextInput
            ref={ref}
            style={[
              styles.input,
              {
                color: colors.text.primary,
              },
              inputStyle,
            ]}
            placeholderTextColor={colors.text.disabled}
            secureTextEntry={secureTextEntry}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            {...props}
          />
        </View>
        {error && (
          <Text style={[styles.helperText, styles.error]}>{error}</Text>
        )}
        {helperText && !error && (
          <Text style={[styles.helperText, styles.helper]}>{helperText}</Text>
        )}
      </View>
    );
  }
);

Input.displayName = 'Input';

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.md,
  },
  label: {
    ...typography.fontSize.base,
    fontWeight: typography.fontWeight.medium,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  inputContainer: {
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  input: {
    ...typography.fontSize.base,
    paddingVertical: 0,
  },
  helperText: {
    ...typography.fontSize.sm,
    marginTop: spacing.xs,
  },
  error: {
    color: colors.border.error,
  },
  helper: {
    color: colors.text.disabled,
  },
});
