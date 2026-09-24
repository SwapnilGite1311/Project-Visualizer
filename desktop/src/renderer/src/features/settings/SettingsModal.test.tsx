// @vitest-environment jsdom
import { act, fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { createRegistry } from '../../core/registry';
import { useAppStore } from '../../core/store';
import { SettingsModal } from './SettingsModal';

beforeEach(() => {
  useAppStore.setState(useAppStore.getInitialState());
});

describe('SettingsModal', () => {
  it('lists sections and switches between them', () => {
    const r = createRegistry();
    r.addSettingsSection({ id: 'ai', title: 'AI', order: 10, component: () => <div>ai section</div> });
    r.addSettingsSection({ id: 'general', title: 'General', order: 20, component: () => <div>general section</div> });
    render(<SettingsModal registry={r} />);
    expect(screen.queryByText('ai section')).toBeNull();
    act(() => useAppStore.getState().setSettingsOpen(true));
    expect(screen.getByText('ai section')).toBeInTheDocument();
    fireEvent.click(screen.getByText('General'));
    expect(screen.getByText('general section')).toBeInTheDocument();
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(useAppStore.getState().settingsOpen).toBe(false);
  });
});
