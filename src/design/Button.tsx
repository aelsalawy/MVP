import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
  Pressable,
} from 'react-native';
import { colors, radius, spacing, shadows, typography } from './theme';

export type ButtonVariant = 'primary' | 'secondary';
export type ButtonSize = 'sm' | 'md' | 'lg';
export type ButtonState = 'default' | 'pressed' | 'disabled';

export interface ButtonProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  state?: ButtonState;
  loading?: boolean;
  children: React.ReactNode;
  onPress?: () => void;
  disabled?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

const variantStyles = {
  primary: {
    default: {
      backgroundColor: colors.primary[500],
      textColor: colors.background.base,
    },
    pressed: {
      backgroundColor: colors.primary[600],
    },
    disabled: {
      backgroundColor: colors.text.disabled,
    },
  },
  secondary: {
    default: {
      backgroundColor: colors.background.surface,
      borderColor: colors.border.default,
      textColor: colors.text.primary,
    },
    pressed: {
      backgroundColor: colors.background.elevated,
      borderColor: colors.border.focused,
    },
    disabled: {
      backgroundColor: colors.border.default,
      textColor: colors.text.disabled,
    },
  },
};

const sizeStyles = {
  sm: { paddingVertical: spacing.sm, paddingHorizontal: spacing.md, fontSize: typography.fontSize.sm },
  md: { paddingVertical: spacing.md, paddingHorizontal: spacing.lg, fontSize: typography.fontSize.base },
  lg: { paddingVertical: spacing.lg, paddingHorizontal: spacing.xl, fontSize: typography.fontSize.lg },
};

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  state = 'default',
  loading = false,
  children,
  onPress,
  disabled = false,
  style,
  textStyle,
}) => {
  const isDisabled = disabled || state === 'disabled' || loading;

  const handlePress = () => {
    if (!isDisabled && onPress) {
      onPress();
    }
  };

  const currentVariant = variantStyles[variant];
  const currentSize = sizeStyles[size];

  return (
    <Pressable
      onPress={handlePress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: pressed ? currentVariant.pressed.backgroundColor : currentVariant.default.backgroundColor,
          opacity: isDisabled ? 0.5 : 1,
          ...currentSize,
        },
        state === 'disabled' && currentVariant.disabled,
        style,
      ]}
    >
      {({ pressed }) => (
        <>
          {loading ? (
            <ActivityIndicator color={variant === 'primary' ? colors.background.base : colors.primary[500]} />
          ) : (
            <Text
              style={[
                styles.text,
                {
                  color: currentVariant.default.textColor,
                  ...currentSize,
                },
                textStyle,
              ]}
            >
              {children}
            </Text>
          )}
        </>
      )}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: radius.md,
    ...shadows.sm,
  },
  text: {
    fontWeight: '600',
    textAlign: 'center',
  },
});
