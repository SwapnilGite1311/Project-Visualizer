import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createRegistry } from '../../core/registry';
import { useAppStore } from '../../core/store';
import { gnode } from '../../view/test-data';
import { useMotionStore } from './motion-store';
import register from './register';
import { numbered, step } from './test-data';

vi.mock('./motion-api', () => ({ unloadTrace: vi.fn(async () => ({ removed: true })) }));

beforeEach(() => {
  useMotionStore.getState().close();
  useAppStore.setState({ activePanel: { left: null, center: null, right: null, bottom: null } });
});

describe('motion feature', () => {
  it('registers panels, the map sync, the command and node actions', () => {
    const r = createRegistry();
    register(r);
    expect(r.panels('bottom').map((p) => p.id)).toEqual(['motion']);
    expect(r.panels('center').map((p) => p.id)).toEqual(['motion-inside']);
    expect(r.globals().map((g) => g.id)).toEqual(['motion-map-sync']);
    expect(r.commands()[0]).toMatchObject({ id: 'motion.open', shortcut: 'Ctrl+Shift+M' });
    void r.commands()[0].run();
    expect(useAppStore.getState().activePanel.bottom).toBe('motion');

    const fn = gnode('function:main.py#main', 'function');
    expect(r.nodeActions(fn).map((a) => a.id)).toEqual(['motion-walkthrough']);
    expect(r.nodeActions(gnode('package:app', 'package'))).toEqual([]);
  });

  it('watches a function inside once a run is loaded', () => {
    const r = createRegistry();
    register(r);
    useMotionStore.getState().loadWalkthrough(
      numbered([step('call', 'function:main.py#main', 0, 7), step('call', 'function:app/utils.py#normalize', 1, 4), step('return', 'function:app/utils.py#normalize', 1, 5)]),
    );
    const fn = gnode('function:app/utils.py#normalize', 'function');
    const watch = r.nodeActions(fn).find((a) => a.id === 'motion-watch');
    expect(watch).toBeDefined();
    void watch!.run(fn);
    expect(useMotionStore.getState()).toMatchObject({ index: 1, mode: 'inside' });
    expect(useAppStore.getState().activePanel.center).toBe('motion-inside');
  });
});
