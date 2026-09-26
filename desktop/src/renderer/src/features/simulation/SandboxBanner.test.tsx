// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { type FakeBridge, installFakeBridge } from '../../api/fake-bridge';
import { useAppStore } from '../../core/store';
import { SandboxBanner } from './SandboxBanner';
import { useSimStore } from './sim-store';
import { fakeSimEngine } from './sim-test-data';

let fake: FakeBridge;

beforeEach(() => {
  fake = installFakeBridge();
  fakeSimEngine(fake);
  useAppStore.setState(useAppStore.getInitialState());
  useSimStore.setState(useSimStore.getInitialState());
  useAppStore.getState().openedProject('base', 'C:/code/app');
});
afterEach(cleanup);

describe('SandboxBanner', () => {
  it('is shown only inside a sandbox and offers run, exit and discard', async () => {
    render(<SandboxBanner />);
    expect(screen.queryByRole('status', { name: 'Simulation sandbox' })).toBeNull();
    await act(() => useSimStore.getState().start('slow db'));
    expect(screen.getByRole('status', { name: 'Simulation sandbox' }).textContent).toContain('nothing here changes your real code');
    fireEvent.click(screen.getByRole('button', { name: 'Run simulation' }));
    await act(async () => undefined);
    expect(fake.rpcCalls.some((c) => c.method === 'sim.run')).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: 'Exit' }));
    expect(screen.queryByRole('status', { name: 'Simulation sandbox' })).toBeNull();
    expect(useAppStore.getState().projectId).toBe('base');
  });
});
