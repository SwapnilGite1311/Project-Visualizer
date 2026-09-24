// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { installFakeBridge } from '../../api/fake-bridge';
import { GeneralSettings } from './GeneralSettings';

let settings: Record<string, unknown>;

beforeEach(() => {
  settings = {};
  const fake = installFakeBridge();
  fake.invokeHandlers.set('pv:settings.get', (p) => {
    const { key, fallback } = p as { key: string; fallback: unknown };
    return key in settings ? settings[key] : fallback;
  });
  fake.invokeHandlers.set('pv:settings.set', (p) => {
    const { key, value } = p as { key: string; value: unknown };
    settings[key] = value;
    return true;
  });
});

describe('GeneralSettings', () => {
  it('applies and saves the light theme', async () => {
    render(<GeneralSettings />);
    fireEvent.change(screen.getByLabelText('Theme'), { target: { value: 'light' } });
    expect(document.documentElement.dataset.theme).toBe('light');
    await waitFor(() => expect(settings['ui.theme']).toBe('light'));
  });

  it('saves folders to skip as a list', async () => {
    render(<GeneralSettings />);
    fireEvent.change(screen.getByLabelText('Folders to skip (one pattern per line)'), {
      target: { value: 'tests/**\n\n  docs/**  \n' },
    });
    await waitFor(() => expect(settings['project.excludeGlobs']).toEqual(['tests/**', 'docs/**']));
  });
});
