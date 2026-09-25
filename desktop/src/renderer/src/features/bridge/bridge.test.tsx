// @vitest-environment jsdom
import { act, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { type FakeBridge, installFakeBridge } from '../../api/fake-bridge';
import { createRegistry } from '../../core/registry';
import { useAppStore } from '../../core/store';
import { useToasts } from '../../core/notify';
import { gnode } from '../../view/test-data';
import { revealNode } from '../../view/reveal';
import { useExplainStore } from '../explain/explain-store';
import { BridgeStatus, POLL_MS } from './BridgeStatus';
import { startBridgeWatcher } from './bridge-watcher';
import register, { openInVsCode } from './register';

vi.mock('../../view/reveal', () => ({ revealNode: vi.fn(async () => undefined) }));

let fake: FakeBridge;
const explain = vi.fn(async () => undefined);
beforeEach(() => {
  vi.clearAllMocks();
  fake = installFakeBridge();
  useAppStore.setState({ projectId: 'p1', projectRoot: 'C:/code/app' });
  useExplainStore.setState({ explain });
  useToasts.setState({ items: [] });
});
afterEach(() => vi.useRealTimers());

describe('bridge watcher', () => {
  it('reveals and explains what VS Code asks for', async () => {
    const node = gnode('function:app/utils.py#is_valid', 'function');
    fake.rpcHandlers.set('locate.node_at', () => ({ node }));
    const stop = startBridgeWatcher();
    fake.emitEvent('pv:bridge.reveal', { file_path: 'C:/code/app/app/utils.py', line: 9 });
    await waitFor(() => expect(revealNode).toHaveBeenCalledWith(node.id));
    expect(fake.rpcCalls[0]).toEqual({ method: 'locate.node_at', params: { project_id: 'p1', file_path: 'C:/code/app/app/utils.py', line: 9 } });
    fake.emitEvent('pv:bridge.explain', { file_path: 'C:/code/app/app/utils.py', line: 9 });
    await waitFor(() => expect(explain).toHaveBeenCalledWith(node));
    stop();
  });

  it('tells the user when the file is not in the project', async () => {
    fake.rpcHandlers.set('locate.node_at', () => ({ node: null }));
    const stop = startBridgeWatcher();
    fake.emitEvent('pv:bridge.reveal', { file_path: 'C:/other/x.py', line: 1 });
    await waitFor(() => expect(useToasts.getState().items.map((t) => t.title)).toContain('That file is not part of the open project'));
    expect(revealNode).not.toHaveBeenCalled();
    stop();
  });
});

describe('bridge status and actions', () => {
  it('shows whether VS Code is connected', async () => {
    vi.useFakeTimers();
    let clients = 0;
    fake.invokeHandlers.set('pv:bridge.status', () => ({ running: true, port: 47101, clients }));
    render(<BridgeStatus />);
    await act(async () => vi.advanceTimersByTimeAsync(0));
    expect(screen.getByText('VS Code: not connected')).toBeInTheDocument();
    clients = 1;
    await act(async () => vi.advanceTimersByTimeAsync(POLL_MS));
    expect(screen.getByText('VS Code: connected')).toBeInTheDocument();
  });

  it('opens code in VS Code and explains when no extension is connected', async () => {
    let sent = true;
    fake.invokeHandlers.set('pv:bridge.openInIde', () => ({ sent }));
    const node = { ...gnode('function:app/utils.py#normalize', 'function', 2), file_path: 'app/utils.py' };
    await openInVsCode(node);
    expect(fake.invokeCalls[0]).toEqual({ channel: 'pv:bridge.openInIde', payload: { file_path: 'C:/code/app/app/utils.py', line: 1 } });
    sent = false;
    await openInVsCode(node);
    expect(useToasts.getState().items.map((t) => t.title)).toContain('VS Code extension not connected');
  });

  it('registers the watcher, status item and node action', () => {
    const r = createRegistry();
    register(r);
    expect(r.globals().map((g) => g.id)).toEqual(['bridge-watcher']);
    expect(r.statusItems().map((s) => s.id)).toEqual(['bridge']);
    expect(r.nodeActions({ ...gnode('function:a.py#f', 'function'), file_path: 'a.py' }).map((a) => a.id)).toEqual(['open-in-vscode']);
    expect(r.nodeActions({ ...gnode('package:app', 'package'), file_path: '' })).toEqual([]);
  });
});
