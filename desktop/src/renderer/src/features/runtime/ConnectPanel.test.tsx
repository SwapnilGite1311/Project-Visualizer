// @vitest-environment jsdom
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { type FakeBridge, installFakeBridge } from '../../api/fake-bridge';
import { useAppStore } from '../../core/store';
import { ConnectPanel, snippets } from './ConnectPanel';

const writeText = vi.fn<(text: string) => Promise<void>>(async () => undefined);
let fake: FakeBridge;
const info = {
  url: 'http://127.0.0.1:47100',
  token: 'abc123token',
  running: true,
  port: 47100,
  received: 10,
  rejected: 0,
  unauthorized: 2,
  forwarded: 8,
  dropped_no_project: 2,
  dropped_other_root: 0,
  dropped_overflow: 0,
  errors: 0,
};

beforeEach(() => {
  writeText.mockClear();
  Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
  fake = installFakeBridge();
  fake.invokeHandlers.set('pv:runtime.hubInfo', () => info);
  fake.invokeHandlers.set('pv:runtime.regenerateToken', () => ({ token: 'fresh-token' }));
  useAppStore.setState({ projectRoot: 'C:/code/shop' });
});

describe('ConnectPanel', () => {
  it('hides the token until asked and copies the real one', async () => {
    render(<ConnectPanel />);
    const token = await screen.findByLabelText('Token');
    expect(token.textContent).not.toContain('abc123token');
    expect(document.body.textContent).not.toContain('abc123token');
    expect(screen.getByLabelText('Receiver counts').textContent).toContain(
      'Received 10 · Sent to the map 8 · Dropped 2 · Wrong token 2',
    );
    fireEvent.click(screen.getByRole('button', { name: 'Copy token' }));
    await waitFor(() => expect(writeText).toHaveBeenCalledWith('abc123token'));
    fireEvent.click(screen.getAllByRole('button', { name: 'Copy' })[0]);
    await waitFor(() => expect(writeText).toHaveBeenCalledTimes(2));
    expect(writeText.mock.calls[1][0]).toContain('abc123token');
    expect(writeText.mock.calls[1][0]).toContain('python -m pv_agent run your_app.py');
    fireEvent.click(screen.getByRole('button', { name: 'Show' }));
    expect(screen.getByLabelText('Token').textContent).toBe('abc123token');
  });

  it('regenerates the token after confirmation', async () => {
    render(<ConnectPanel />);
    fireEvent.click(await screen.findByRole('button', { name: 'Regenerate token…' }));
    expect(fake.invokeCalls.filter((c) => c.channel === 'pv:runtime.regenerateToken')).toHaveLength(
      0,
    );
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Regenerate' }));
    });
    fireEvent.click(screen.getByRole('button', { name: 'Show' }));
    expect(screen.getByLabelText('Token').textContent).toBe('fresh-token');
  });

  it('builds snippets for Python, Node and OpenTelemetry', () => {
    const [py, node, otel] = snippets('http://127.0.0.1:47103', 'tok', 'C:/code/shop');
    expect(py.text).toContain('PV_RUNTIME_TOKEN');
    expect(py.text).toContain('C:/code/shop');
    expect(py.text).toContain('PV_RUNTIME_URL'); // not the default port
    expect(node.text).toContain('node --import @pv/agent-node/register app.js');
    expect(otel.text).toContain('http://127.0.0.1:47103/v1/traces');
    expect(otel.text).toContain('http/json');
    expect(otel.text).toContain('Authorization=Bearer tok');
    expect(snippets('http://127.0.0.1:47100', 't', '/p')[0].text).not.toContain('PV_RUNTIME_URL');
  });

  it('explains when the receiver is not running', async () => {
    fake.invokeHandlers.set('pv:runtime.hubInfo', () => ({ ...info, running: false }));
    render(<ConnectPanel />);
    expect(await screen.findByText(/not running/)).toBeTruthy();
  });
});
