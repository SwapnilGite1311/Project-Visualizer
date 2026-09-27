// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import { installFakeBridge } from '../../api/fake-bridge';
import { SIMPLE_WORDS_KEY, usePlainWordsStore } from './plain-store';

describe('simple-words setting', () => {
  let saved: Map<string, unknown>;
  beforeEach(() => {
    saved = new Map();
    const fake = installFakeBridge();
    fake.invokeHandlers.set('pv:settings.get', (p) => {
      const q = p as { key: string; fallback: unknown };
      return saved.has(q.key) ? saved.get(q.key) : q.fallback;
    });
    fake.invokeHandlers.set('pv:settings.set', (p) => {
      const q = p as { key: string; value: unknown };
      saved.set(q.key, q.value);
      return true;
    });
    usePlainWordsStore.setState(usePlainWordsStore.getInitialState());
  });

  it('is on by default and remembers when switched off', async () => {
    await usePlainWordsStore.getState().load();
    expect(usePlainWordsStore.getState().simple).toBe(true);
    await usePlainWordsStore.getState().setSimple(false);
    expect(saved.get(SIMPLE_WORDS_KEY)).toBe(false);
    usePlainWordsStore.setState(usePlainWordsStore.getInitialState());
    await usePlainWordsStore.getState().load();
    expect(usePlainWordsStore.getState().simple).toBe(false);
  });
});
