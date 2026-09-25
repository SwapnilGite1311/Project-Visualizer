// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import { type FakeBridge, installFakeBridge } from '../../api/fake-bridge';
import { cancelRecording, findPython, getSteps, loadTrace, motionBody, pickTraceFile, recordRun, unloadTrace } from './motion-api';

let fake: FakeBridge;
beforeEach(() => {
  fake = installFakeBridge();
  for (const m of ['motion.body', 'motion.load_trace', 'motion.steps', 'motion.unload']) fake.rpcHandlers.set(m, () => ({}));
  for (const c of ['pv:motion.python', 'pv:motion.record', 'pv:motion.cancel', 'pv:motion.pickTrace']) fake.invokeHandlers.set(c, () => null);
});

describe('motion api', () => {
  it('calls the engine methods', async () => {
    await motionBody('p1', 'function:a.py#f');
    await loadTrace('p1', 'C:/t.jsonl');
    await getSteps('t1', 10, 500);
    await unloadTrace('t1');
    expect(fake.rpcCalls).toEqual([
      { method: 'motion.body', params: { project_id: 'p1', node_id: 'function:a.py#f' } },
      { method: 'motion.load_trace', params: { project_id: 'p1', path: 'C:/t.jsonl' } },
      { method: 'motion.steps', params: { trace_id: 't1', from: 10, count: 500 } },
      { method: 'motion.unload', params: { trace_id: 't1' } },
    ]);
  });

  it('calls the main-process channels', async () => {
    await findPython();
    await recordRun('C:/code', 'main.py');
    await recordRun('C:/code', 'main.py', 5000);
    await cancelRecording();
    await pickTraceFile();
    expect(fake.invokeCalls).toEqual([
      { channel: 'pv:motion.python', payload: undefined },
      { channel: 'pv:motion.record', payload: { root: 'C:/code', command: 'main.py' } },
      { channel: 'pv:motion.record', payload: { root: 'C:/code', command: 'main.py', maxEvents: 5000 } },
      { channel: 'pv:motion.cancel', payload: undefined },
      { channel: 'pv:motion.pickTrace', payload: undefined },
    ]);
  });
});
