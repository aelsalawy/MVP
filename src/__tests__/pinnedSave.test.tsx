/**
 * T8.1a: FR-1.4 pinned-save component test skeleton (design-system Button).
 * Pure component coverage; wizard-screen integration skeletons land with T2.2.
 */
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Button } from '../design';

describe('FR-1.4: pinned primary action button (design-system contract)', () => {
  test('renders children and fires onPress', async () => {
    const onPress = jest.fn();
    const { getByText } = await render(
      <Button variant="primary" onPress={onPress}>Save</Button>
    );
    fireEvent.press(getByText('Save'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  test('disabled button does not fire onPress', async () => {
    const onPress = jest.fn();
    const { getByText } = await render(
      <Button variant="primary" disabled onPress={onPress}>Save</Button>
    );
    fireEvent.press(getByText('Save'));
    expect(onPress).not.toHaveBeenCalled();
  });

  // TODO(T2.2): assert wizard Save is pinned bottom (safe-area anchored) on
  // every step screen; add per-screen integration tests once manual-pick
  // wizard lands.
  test.todo('FR-1.4: wizard Save visible without scroll on each step (T2.2)');
});
