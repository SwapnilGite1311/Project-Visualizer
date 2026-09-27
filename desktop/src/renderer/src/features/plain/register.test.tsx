// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { installFakeBridge } from '../../api/fake-bridge';
import { createRegistry } from '../../core/registry';
import { PlainSettings } from './PlainSettings';
import { usePlainWordsStore } from './plain-store';
import register, { PlainWordsLoader } from './register';

beforeEach(() => {
  const fake = installFakeBridge();
  fake.invokeHandlers.set('pv:settings.get', () => false);
  fake.invokeHandlers.set('pv:settings.set', () => true);
  usePlainWordsStore.setState(usePlainWordsStore.getInitialState());
});
afterEach(cleanup);

describe('words feature', () => {
  it('registers the Words settings section and the loader', () => {
    const r = createRegistry();
    register(r);
    expect(r.settingsSections()).toEqual([expect.objectContaining({ id: 'words', title: 'Words' })]);
    expect(r.globals().map((g) => g.id)).toEqual(['plain-words-loader']);
  });

  it('loads the saved choice at start', async () => {
    render(<PlainWordsLoader />);
    await waitFor(() => expect(usePlainWordsStore.getState().loaded).toBe(true));
    expect(usePlainWordsStore.getState().simple).toBe(false);
  });

  it('switches simple words and lists the glossary', () => {
    render(<PlainSettings />);
    const box = screen.getByRole('checkbox', { name: /Use simple words/ });
    expect((box as HTMLInputElement).checked).toBe(true);
    fireEvent.click(box);
    expect(usePlainWordsStore.getState().simple).toBe(false);
    const table = screen.getByRole('table', { name: 'Glossary' });
    expect(table.textContent).toContain('module');
    expect(table.textContent).toContain('Used by');
  });
});
