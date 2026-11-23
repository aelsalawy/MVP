/**
 * Paywall route (T7.1): wraps the matrix-driven Paywall component with the
 * live tier from useEntitlements. Reached from the dashboard Upgrade button
 * (free tier) / Manage subscription (pro).
 */
import { View, Text, StyleSheet } from 'react-native';
import { useAuth } from '../../src/hooks/useAuth';
import { useEntitlements } from '../../src/hooks/useEntitlements';
import { Paywall } from '../../src/components/Paywall';
import { colors } from '../../src/design/theme';

export default function PaywallScreen() {
  const { user } = useAuth();
  const { planTier, error } = useEntitlements(user?.uid);

  return (
    <>
      {error ? (
        <View style={styles.errorBar}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}
      <Paywall planTier={planTier} />
    </>
  );
}

const styles = StyleSheet.create({
  errorBar: { padding: 8, backgroundColor: colors.error.background },
  errorText: { color: colors.error.default, fontSize: 12 },
});
