import { View, StyleSheet, Text } from 'react-native';
import useAuthStore from '../../src/hooks/useAuth';
import { Screen } from '../../src/design/Screen';
import { Button } from '../../src/design/Button';

export default function DashboardScreen() {
  const { user } = useAuthStore();

  const handleLogout = async () => {
    await auth.signOut();
    // User will be redirected by index.tsx redirect logic
  };

  return (
    <Screen scrollable={false}>
      <View style={styles.container}>
        <Text style={styles.title}>Dashboard</Text>
        <Text style={styles.email}>{user?.email}</Text>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Welcome to Car Tracker</Text>
          <Text style={styles.cardText}>
            This is a placeholder dashboard. The full dashboard implementation will be in a future task.
          </Text>
        </View>

        <Button onPress={handleLogout} variant="secondary">
          Sign Out
        </Button>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#f8fafc',
  },
  email: {
    fontSize: 16,
    color: '#94a3b8',
  },
  card: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 24,
    width: '80%',
    maxWidth: 400,
    borderWidth: 1,
    borderColor: '#334155',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#f8fafc',
    marginBottom: 12,
  },
  cardText: {
    fontSize: 14,
    color: '#94a3b8',
    lineHeight: 20,
  },
});
