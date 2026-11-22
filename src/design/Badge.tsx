import React from 'react';
import { View, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { colors, radius, typography, spacing } from './theme';

export type BadgeVariant = 'default' | 'success' | 'warning' | 'error' | 'info';

export interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  size?: 'sm' | 'md' | 'lg';
  style?: ViewStyle;
  textStyle?: TextStyle;
  rounded?: boolean;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'default',
  size = 'md',
  style,
  textStyle,
  rounded = true,
}) => {
  const variantStyles: Record<BadgeVariant, { background: string; text: string }> = {
    default: {
      background: colors.border.default,
      text: colors.text.primary,
    },
    success: {
      background: colors.success.background,
      text: colors.success.default,
    },
    warning: {
      background: colors.warning.background,
      text: colors.warning.default,
    },
    error: {
      background: colors.error.background,
      text: colors.error.default,
    },
    info: {
      background: colors.info.background,
      text: colors.info.default,
    },
  };

  const sizeStyles: Record<string, { fontSize: number; paddingX: number; paddingY: number }> = {
    sm: {
      fontSize: typography.fontSize.xs as number,
      paddingX: spacing.sm,
      paddingY: spacing.xs,
    },
    md: {
      fontSize: typography.fontSize.sm as number,
      paddingX: spacing.md,
      paddingY: spacing.sm,
    },
    lg: {
      fontSize: typography.fontSize.base as number,
      paddingX: spacing.lg,
      paddingY: spacing.md,
    },
  };

  const { background, text } = variantStyles[variant];
  const { fontSize, paddingX, paddingY } = sizeStyles[size];

  const badgeStyle: ViewStyle = {
    backgroundColor: background,
    borderRadius: rounded ? radius.full : radius.sm,
    paddingHorizontal: paddingX,
    paddingVertical: paddingY,
  };

  const textStyleProp: TextStyle = {
    fontSize,
    fontWeight: '600',
    color: text,
  };

  return (
    <View style={[styles.badge, badgeStyle, style]}>
      <Text style={[styles.text, textStyleProp, textStyle]}>{children}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    textAlign: 'center',
  },
});
