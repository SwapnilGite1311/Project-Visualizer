// @vitest-environment jsdom
import { act, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { installFakeBridge } from './fake-bridge';
import { EngineStatusItem } from './use-engine-status';

describe('EngineStatusItem', () => {
  it('shows the initial status and follows events', async () => {
    const fake = installFakeBridge();
    fake.invokeHandlers.set('pv:app.info', () => ({ version: '0.1.0', platform: 'win32', engineStatus: 'ready', enginePath: 'x' }));
    render(<EngineStatusItem />);
    expect(await screen.findByText('Engine ready')).toBeInTheDocument();
    act(() => fake.emitEvent('pv:engine.status', { status: 'crashed' }));
    expect(screen.getByText('Engine crashed')).toBeInTheDocument();
  });
});
