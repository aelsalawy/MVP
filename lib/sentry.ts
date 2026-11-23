/**
 * Sentry initialization — T8.2 (car-tracker-mvp).
 *
 * DSN is injected at build time from app config extra (see app.json /
 * eas.json) or falls back to SENTRY_DSN env. Never hardcode the DSN here.
 *
 * Features enabled (per Sentry agent-setup defaults for RN):
 *  - errors (captureException / captureMessage, global handler)
 *  - tracing (navigation + app start + native frames sampling)
 *  - logs (sentry.logger)
 *  - Session Replay placeholder is intentionally OFF for beta (RN replay
 *    is alpha; revisit post-beta).
 */
import * as Sentry from '@sentry/react-native';
import Constants from 'expo-constants';

const DSN: string =
  Constants.expoConfig?.extra?.sentryDsn ??
  process.env.EXPO_PUBLIC_SENTRY_DSN ??
  '';

export const sentryEnabled = DSN.length > 0;

if (sentryEnabled) {
  Sentry.init({
    dsn: DSN,
    environment: __DEV__ ? 'development' : 'production',
    // Release is set automatically from app.json version + native build
    // number by the SDK when built through EAS; leave default here.
    enableLogs: true,
    tracesSampleRate: __DEV__ ? 1.0 : 0.2,
    // Errors are never sampled — always send.
    sendDefaultPii: false,
  });
} else if (__DEV__) {
   
  console.warn(
    '[sentry] No DSN configured (extra.sentryDsn / EXPO_PUBLIC_SENTRY_DSN) — telemetry disabled.',
  );
}

export { Sentry };
