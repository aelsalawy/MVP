import React from 'react';
import { View, Text, StyleSheet, ViewStyle, Pressable } from 'react-native';
import { colors, spacing, radius, shadows } from './theme';

export interface ListRowProps {
  left?: React.ReactNode;
  title?: string;
  subtitle?: string;
  right?: React.ReactNode;
  onPress?: () => void;
  style?: ViewStyle;
  iconColor?: string;
  showDivider?: boolean;
}

export const ListRow: React.FC<ListRowProps> = ({
  left,
  title,
  subtitle,
  right,
  onPress,
  style,
  iconColor = colors.text.secondary,
  showDivider = true,
}) => {
  return (
    <>
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          styles.row,
          pressed && styles.rowPressed,
          style,
        ]}
      >
        <View style={styles.leftContent}>
          {left}
        </View>
        <View style={styles.centerContent}>
          {title && (
            <Text style={[styles.title, { color: colors.text.primary }]}>
              {title}
            </Text>
          )}
          {subtitle && (
            <Text style={[styles.subtitle, { color: colors.text.secondary }]}>
              {subtitle}
            </Text>
          )}
        </View>
        <View style={styles.rightContent}>
          {right}
        </View>
      </Pressable>
      {showDivider && <View style={styles.divider} />}
    </>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    backgroundColor: colors.background.surface,
    borderRadius: radius.md,
    marginHorizontal: spacing.sm,
    marginVertical: spacing.xs,
    ...shadows.sm,
  },
  rowPressed: {
    backgroundColor: colors.background.elevated,
  },
  leftContent: {
    marginRight: spacing.md,
  },
  centerContent: {
    flex: 1,
  },
  rightContent: {
    marginLeft: spacing.md,
  },
  title: {
    ...typography.fontSize.base,
    fontWeight: typography.fontWeight.medium,
  },
  subtitle: {
    ...typography.fontSize.sm,
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border.default,
    marginLeft: spacing.lg,
  },
});
