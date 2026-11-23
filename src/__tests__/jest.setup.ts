/* eslint-env jest */
/**
 * Jest setup for component tests (T8.1a).
 * - Auto-cleanup after each test.
 * - react-native is mocked (see rn-mock.js) because RN 0.88's entry contains
 *   Flow ESM-ish syntax that Jest cannot load in the node environment.
 */
import { cleanup } from '@testing-library/react-native';
import { afterEach } from '@jest/globals';

afterEach(() => {
  cleanup();
});
