// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { type FakeBridge, installFakeBridge } from '../../api/fake-bridge';
import { useAppStore } from '../../core/store';
import { gnode } from '../../view/test-data';
import { componentActions } from './actions';
import { useComponentStates } from './states-store';

vi.mock('../../api/main', () => ({ getSetting: vi.fn(), setSetting: vi.fn(async () => true) }));

const writeText = vi.fn<(text: string) => Promise<void>>(async () => undefined);
let fake: FakeBridge;
beforeEach(() => {
  vi.clearAllMocks();
  Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
  fake = installFakeBridge();
  fake.invokeHandlers.set('pv:shell.showItemInFolder', () => true);
  useAppStore.setState({ projectRoot: 'C:/code/app' });
  useComponentStates.setState({ pinned: [] });
});

const action = (id: string) => componentActions().find((a) => a.id === id)!;
const fn = { ...gnode('function:app/a.py#f', 'function'), file_path: 'app/a.py' };
const pkg = { ...gnode('package:app', 'package'), file_path: '' };

describe('component actions', () => {
  it('only offers file actions for elements with a file', () => {
    expect(action('copy-path').when?.(fn)).toBe(true);
    expect(action('copy-path').when?.(pkg)).toBe(false);
    expect(action('show-in-folder').when?.(pkg)).toBe(false);
  });

  it('copies names, ids and paths', async () => {
    await action('copy-name').run(fn);
    await action('copy-id').run(fn);
    await action('copy-path').run(fn);
    expect(writeText.mock.calls.map((c) => c[0])).toEqual(['f', 'function:app/a.py#f', 'app/a.py']);
  });

  it('pins and shows the file in its folder', async () => {
    await action('pin').run(fn);
    expect(useComponentStates.getState().pinned).toEqual(['function:app/a.py#f']);
    await action('show-in-folder').run(fn);
    expect(fake.invokeCalls.at(-1)).toEqual({ channel: 'pv:shell.showItemInFolder', payload: { path: 'C:/code/app/app/a.py' } });
  });
});
