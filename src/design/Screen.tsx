import React from 'react';
import { SafeAreaView, StyleSheet, ViewStyle } from 'react-native';
import { colors, spacing } from './theme';

export interface ScreenProps {
  children: React.ReactNode;
  style?: ViewStyle;
  safeAreaTop?: boolean;
  safeAreaBottom?: boolean;
  padding?: keyof typeof spacing;
  scrollable?: boolean;
}

export const Screen: React.FC<ScreenProps> = ({
  children,
  style,
  safeAreaTop = true,
  safeAreaBottom = true,
  padding = 'lg',
  scrollable = false,
}) => {
  const screenStyle: ViewStyle = {
    backgroundColor: colors.background.base,
    flex: 1,
  };

  return (
    <SafeAreaView
      style={safeAreaTop ? styles.safeAreaTop : undefined}
      edges={['top']}
    >
      <View
        style={[
          styles.container,
          screenStyle,
          { padding: spacing[padding] },
          scrollable && styles.scrollable,
          style,
        ]}
      >
        {children}
      </View>
      {safeAreaBottom && <View style={styles.safeAreaBottom} />}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeAreaTop: {
    backgroundColor: colors.background.base,
  },
  safeAreaBottom: {
    height: 20,
  },
  container: {
    minHeight: '100%',
  },
  scrollable: {
    flex: 1,
  },
});
