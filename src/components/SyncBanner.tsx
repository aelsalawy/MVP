import React from 'react';
import { StyleSheet, Text, View, ViewStyle } from 'react-native';
import { colors, spacing, typography, radius } from '../design';

/**
 * Offline sync banner (T3.4 / NFR-2): small informational strip shown on the
 * History and vehicle screens when Firestore snapshots are being served from
 * the local cache (device offline) and/or writes are still pending sync.
 *
 * Pure visibility/message derivations are exported below (and unit-tested in
 * src/__tests__/syncState.test.ts without React or Firestore).
 */
export interface SyncStatus {
  /** false when snapshot data is served from the local cache (offline). */
  synced: boolean;
  /** true when local writes await server acknowledgement. */
  pending: boolean;
}

/**
 * Banner visibility rule (pure): show when out of sync OR when writes are
 * pending. `route` is reserved for screen-specific overrides; the default
 * policy shows the banner on any screen that renders it.
 */
export function bannerVisibleFor(status: SyncStatus, _route?: string): boolean {
  void _route;
  return !status.synced || status.pending;
}

/** Banner copy (pure): cache-read vs pending-writes cases. */
export function bannerMessageFor(status: SyncStatus): string {
  if (!status.synced && status.pending) {
    return 'Offline — changes saved on device and will sync when you reconnect.';
  }
  if (!status.synced) return 'Offline — showing saved data. Reconnecting…';
  return 'Syncing your changes…';
}

export interface SyncBannerProps extends SyncStatus {
  /** Current route path (e.g. '/(vehicle)/history'); reserved for overrides. */
  route?: string;
  style?: ViewStyle;
}

export const SyncBanner: React.FC<SyncBannerProps> = ({ synced, pending, route, style }) => {
  if (!bannerVisibleFor({ synced, pending }, route)) return null;

  return (
    <View style={[styles.banner, style]} testID="sync-banner">
      <Text style={styles.text}>{bannerMessageFor({ synced, pending })}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  banner: {
    backgroundColor: colors.warning.background,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginBottom: spacing.sm,
  },
  text: {
    color: colors.warning.default,
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
    textAlign: 'center',
  },
});
