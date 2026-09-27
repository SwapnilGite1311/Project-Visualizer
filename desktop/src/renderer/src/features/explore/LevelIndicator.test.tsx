// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getNode } from '../../api/engine';
import { useAppStore } from '../../core/store';
import { usePlainWordsStore } from '../plain/plain-store';
import { gnode } from '../../view/test-data';
import { LevelIndicator } from './LevelIndicator';

vi.mock('../../api/engine', () => ({ getNode: vi.fn() }));

beforeEach(() => {
  vi.mocked(getNode).mockResolvedValue({ ...gnode('package:app', 'package'), level: 1 });
});

describe('LevelIndicator', () => {
  it('names the current level in simple words', async () => {
    usePlainWordsStore.setState({ simple: true });
    useAppStore.setState({ screen: 'workspace', projectId: 'p1', currentParentId: 'package:app' });
    render(<LevelIndicator />);
    expect(await screen.findByText('Files in app')).toBeInTheDocument();
  });

  it('names the current level exactly when simple words are off', async () => {
    usePlainWordsStore.setState({ simple: false });
    useAppStore.setState({ screen: 'workspace', projectId: 'p1', currentParentId: 'package:app' });
    render(<LevelIndicator />);
    expect(await screen.findByText('Level 2 · Modules of app')).toBeInTheDocument();
    expect(getNode).toHaveBeenCalledWith('p1', 'package:app');
  });

  it('is hidden on the welcome screen', () => {
    useAppStore.setState({ screen: 'welcome', projectId: null });
    const { container } = render(<LevelIndicator />);
    expect(container).toBeEmptyDOMElement();
  });
});
