/**
 * T3.4 / NFR-2 — offline sync state derivations (pure logic, no JSX needed:
 * ts-jest's inline tsconfig in jest.config.js omits `jsx`, so components are
 * exercised via React.createElement).
 * Covers: banner visibility per {synced, pending, route}, message selection,
 * the SyncBanner component rendering, and readSnapshotStatusOnce against a
 * minimal Firestore mock.
 */
import React from 'react';
import { createRoot } from 'test-renderer';
import { act } from '@testing-library/react-native';
// (test-renderer is the project's React-19 replacement for the deprecated
// react-test-renderer; act comes from RNTL which wires the global IS_REACT_ACT_ENVIRONMENT
// flag in jest.setup.ts. ts-jest's inline tsconfig has no `jsx`, so the
// component is rendered via React.createElement.)
import {
  bannerVisibleFor,
  bannerMessageFor,
  SyncBanner,
} from '../components/SyncBanner';
import { readSnapshotStatusOnce } from '../services/offlineDiagnostics';

describe('bannerVisibleFor (T3.4, NFR-2)', () => {
  it('is hidden when fully synced with no pending writes', () => {
    expect(bannerVisibleFor({ synced: true, pending: false })).toBe(false);
  });

  it('is visible when serving cached (offline) data', () => {
    expect(bannerVisibleFor({ synced: false, pending: false })).toBe(true);
  });

  it('is visible when local writes are pending', () => {
    expect(bannerVisibleFor({ synced: true, pending: true })).toBe(true);
  });

  it('is visible when both offline and pending', () => {
    expect(bannerVisibleFor({ synced: false, pending: true })).toBe(true);
  });

  it('visibility is unaffected by the route argument', () => {
    expect(bannerVisibleFor({ synced: true, pending: false }, '/(vehicle)/history')).toBe(false);
    expect(bannerVisibleFor({ synced: false, pending: false }, '/(vehicle)/service-entry')).toBe(true);
  });
});

describe('bannerMessageFor (T3.4, NFR-2)', () => {
  it('mentions offline queueing when offline with pending writes', () => {
    const msg = bannerMessageFor({ synced: false, pending: true });
    expect(msg).toMatch(/offline/i);
    expect(msg).toMatch(/sync/i);
  });

  it('mentions saved/cached data when offline without pending writes', () => {
    expect(bannerMessageFor({ synced: false, pending: false })).toMatch(/offline/i);
  });

  it('reports syncing when online with pending writes', () => {
    expect(bannerMessageFor({ synced: true, pending: true })).toMatch(/sync/i);
  });
});

describe('SyncBanner component', () => {
  const renderBanner = async (props: {
    synced: boolean;
    pending: boolean;
    route?: string;
  }) => {
    const root = createRoot({ textComponentTypes: ['Text'] });
    await act(async () => {
      root.render(React.createElement(SyncBanner, props));
    });
    return root;
  };

  it('renders nothing when synced and no pending writes', async () => {
    const root = await renderBanner({ synced: true, pending: false });
    // test-renderer's root container is always non-null; a component that
    // renders null leaves the container with no children.
    expect(root.container.children.length).toBe(0);
    expect(
      root.container.queryAll(
        (inst: { props: Record<string, unknown> }) => inst.props.testID === 'sync-banner'
      ).length
    ).toBe(0);
  });

  it('renders the banner with a testID when offline', async () => {
    const root = await renderBanner({ synced: false, pending: false });
    const matches = root.container.queryAll(
      (inst: { props: Record<string, unknown> }) => inst.props.testID === 'sync-banner'
    );
    expect(matches.length).toBeGreaterThan(0);
  });

  it('renders the banner when writes are pending while online', async () => {
    const root = await renderBanner({ synced: true, pending: true, route: '/(vehicle)/history' });
    const matches = root.container.queryAll(
      (inst: { props: Record<string, unknown> }) => inst.props.testID === 'sync-banner'
    );
    expect(matches.length).toBeGreaterThan(0);
  });
});

describe('readSnapshotStatusOnce (minimal Firestore mock)', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.doMock('firebase/firestore', () => {
      const onSnapshot = jest.fn((_c: unknown, cb: (s: unknown) => void) => {
        (onSnapshot as unknown as { snapCb: (s: unknown) => void }).snapCb = cb;
        return jest.fn(); // unsubscribe
      });
      return { collection: jest.fn(), onSnapshot };
    });
    jest.doMock('../../lib/firebase', () => ({ db: {} }));
  });

  afterEach(() => {
    jest.dontMock('firebase/firestore');
    jest.dontMock('../../lib/firebase');
  });

  it('derives {synced,pending} from snapshot metadata and unsubscribes', async () => {
    const { onSnapshot } = await import('firebase/firestore');
    const { readSnapshotStatusOnce: fn } = await import('../services/offlineDiagnostics');

    const results: unknown[] = [];
    const unsub = fn((s) => results.push(s));
    expect(typeof unsub).toBe('function');
    expect(onSnapshot).toHaveBeenCalledTimes(1);

    const snapCb = (onSnapshot as unknown as { snapCb: (s: unknown) => void }).snapCb;
    // Cached snapshot with pending local writes.
    snapCb({ metadata: { fromCache: true, hasPendingWrites: true } });
    expect(results[0]).toEqual({ synced: false, pending: true });
    // Server snapshot, nothing pending.
    snapCb({ metadata: { fromCache: false, hasPendingWrites: false } });
    expect(results[1]).toEqual({ synced: true, pending: false });
  });

  it('reports null when the listener errors (e.g. offline rules)', async () => {
    jest.resetModules();
    let errCb: (e: unknown) => void = () => {};
    jest.doMock('firebase/firestore', () => ({
      collection: jest.fn(),
      onSnapshot: (_c: unknown, _cb: unknown, onErr: (e: unknown) => void) => {
        errCb = onErr;
        return jest.fn();
      },
    }));
    jest.doMock('../../lib/firebase', () => ({ db: {} }));
    const fresh = await import('../services/offlineDiagnostics');

    const results: unknown[] = [];
    fresh.readSnapshotStatusOnce((s) => results.push(s));
    errCb(new Error('offline'));
    expect(results[0]).toBeNull();
  });
});
