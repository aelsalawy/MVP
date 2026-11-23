import { View, StyleSheet, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { auth } from '../../lib/firebase';
import { useAuth } from '../../src/hooks/useAuth';
import { Screen } from '../../src/design/Screen';
import { Card } from '../../src/design/Card';
import { Button } from '../../src/design/Button';

/** Placeholder dashboard shell (full dashboard is T6.1) — signed-in users only. */
export default function DashboardScreen() {
  const router = useRouter();
  const { user } = useAuth();

  const handleLogout = async () => {
    await auth.signOut();
    router.replace('/');
  };

  return (
    <Screen scrollable={false}>
      <View style={styles.container}>
        <Text style={styles.title}>Dashboard</Text>
        <Text style={styles.email}>{user?.email ?? ''}</Text>

        <Card>
          <View style={styles.cardInner}>
            <Text style={styles.cardTitle}>Garage</Text>
            <Text style={styles.cardBody}>Your vehicles will appear here.</Text>
            <Button
              variant="primary"
              size="sm"
              style={styles.cardButton}
              onPress={() => router.push('/(vehicle)/service-entry')}
            >
              + Add service
            </Button>
            <Button
              variant="secondary"
              size="sm"
              style={styles.cardButton}
              onPress={() => router.push('/(vehicle)/history')}
            >
              View history
            </Button>
          </View>
        </Card>

        <Button variant="primary" onPress={handleLogout}>
          Sign out
        </Button>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#f8fafc',
    marginBottom: 4,
  },
  email: {
    fontSize: 14,
    color: '#94a3b8',
    marginBottom: 24,
  },
  cardInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#f8fafc',
  },
  cardBody: {
    fontSize: 13,
    color: '#94a3b8',
  },
  cardButton: {
    marginTop: 12,
    alignSelf: 'flex-start',
  },
});
