import React from 'react';
import { View, StyleSheet, ViewStyle, Pressable, StyleProp } from 'react-native';
import { colors, radius, shadows, spacing } from './theme';

export interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  variant?: 'elevated' | 'flat';
  onPress?: () => void;
  pressable?: boolean;
  padding?: keyof typeof spacing;
}

export const Card: React.FC<CardProps> = ({
  children,
  style,
  variant = 'elevated',
  onPress,
  pressable = false,
  padding = 'md',
}) => {
  const cardStyle: StyleProp<ViewStyle> = [
    styles.card,
    {
      backgroundColor: colors.background.surface,
      borderColor: variant === 'elevated' ? colors.border.default : 'transparent',
      borderWidth: variant === 'elevated' ? 1 : 0,
      padding: spacing[padding],
      borderRadius: radius.lg,
      ...(variant === 'elevated' ? { ...shadows.md } : {}),
    },
    style,
  ];

  if (pressable && onPress) {
    return (
      <Pressable onPress={onPress} style={cardStyle}>
        {children}
      </Pressable>
    );
  }

  return <View style={cardStyle}>{children}</View>;
};

const styles = StyleSheet.create({
  card: {
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
});
