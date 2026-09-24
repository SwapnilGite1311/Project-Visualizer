// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAppStore } from '../../core/store';
import { revealNode } from '../../view/reveal';
import { gnode } from '../../view/test-data';
import { useExplainStore } from './explain-store';
import { ExplainPanel } from './ExplainPanel';

vi.mock('../../view/reveal', () => ({ revealNode: vi.fn(async () => undefined) }));
const node = gnode('function:app/utils.py#is_valid', 'function');

beforeEach(() => {
  useAppStore.setState(useAppStore.getInitialState());
  useExplainStore.setState({ currentNode: null, results: {}, loading: {}, errors: {} });
});

describe('ExplainPanel', () => {
  it('asks the user to choose Explain when empty', () => {
    render(<ExplainPanel />);
    expect(screen.getByText("Choose 'Explain' on any element")).toBeInTheDocument();
  });

  it('renders markdown with clickable citations', () => {
    useExplainStore.setState({
      currentNode: node,
      results: {
        [node.id]: {
          node_id: node.id,
          markdown: '**Summary:** Used by get_user [[node:method:app/services.py#UserService.get_user]].',
          cited_nodes: [{ id: 'method:app/services.py#UserService.get_user', name: 'get_user' }],
          model: 'claude-haiku-4-5-20251001',
        },
      },
    });
    render(<ExplainPanel />);
    expect(screen.getByText('Summary:')).toBeInTheDocument();
    expect(screen.getByText('Model: claude-haiku-4-5-20251001')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'get_user' }));
    expect(revealNode).toHaveBeenCalledWith('method:app/services.py#UserService.get_user');
  });

  it('offers the settings when no API key is set', () => {
    useExplainStore.setState({
      currentNode: node,
      errors: { [node.id]: { code: 'no_api_key', message: 'Add an API key in Settings → AI' } },
    });
    render(<ExplainPanel />);
    expect(screen.getByText('Add an API key in Settings → AI')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Open settings'));
    expect(useAppStore.getState().settingsOpen).toBe(true);
  });
});
