// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { installFakeBridge } from '../../api/fake-bridge';
import { useToasts } from '../../core/notify';
import { useAppStore } from '../../core/store';
import { watchEngineRestarts } from './engine-restart';
import { openProjectFlow } from './open-project';

vi.mock('./open-project', () => ({ openProjectFlow: vi.fn(async () => true) }));

beforeEach(() => {
  vi.clearAllMocks();
  useToasts.setState({ items: [] });
  useAppStore.setState(useAppStore.getInitialState());
});

describe('watchEngineRestarts', () => {
  it('reopens the project after a restart', async () => {
    const fake = installFakeBridge();
    useAppStore.getState().openedProject('p1', 'C:/code/demo');
    const off = watchEngineRestarts();
    for (const status of ['crashed', 'restarting', 'starting', 'ready']) fake.emitEvent('pv:engine.status', { status });
    expect(openProjectFlow).toHaveBeenCalledWith('C:/code/demo');
    await vi.waitFor(() => expect(useToasts.getState().items[0]?.title).toBe('The analysis engine restarted'));
    off();
  });

  it('ignores the first start and does nothing without a project', () => {
    const fake = installFakeBridge();
    const off = watchEngineRestarts();
    fake.emitEvent('pv:engine.status', { status: 'starting' });
    fake.emitEvent('pv:engine.status', { status: 'ready' });
    fake.emitEvent('pv:engine.status', { status: 'restarting' });
    fake.emitEvent('pv:engine.status', { status: 'ready' });
    expect(openProjectFlow).not.toHaveBeenCalled();
    off();
  });
});
