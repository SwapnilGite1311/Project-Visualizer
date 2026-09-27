// @vitest-environment jsdom
import { act, fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { SearchHit } from '../../api/types';
import { revealNode } from '../../view/reveal';
import { usePlainWordsStore } from '../plain/plain-store';
import { SearchPanel } from './SearchPanel';
import { searchBus } from './search-bus';
import { useSearchStore } from './search-store';

vi.mock('../../view/reveal', () => ({ revealNode: vi.fn(async () => undefined) }));

const hit = (name: string, kind: SearchHit['kind'] = 'function'): SearchHit => ({
  node_id: `${kind}:app/x.py::${name}`,
  name,
  kind,
  file_path: 'app/x.py',
  qualified_name: 'app.x.' + name,
  score: 60,
});

const setText = vi.fn();
const toggleKind = vi.fn();
beforeEach(() => {
  vi.clearAllMocks();
  usePlainWordsStore.setState({ simple: false });
  useSearchStore.setState({ text: '', kinds: [], results: [], suggestions: [], loading: false, error: null, setText, toggleKind });
});

describe('SearchPanel', () => {
  it('shows the empty states', () => {
    render(<SearchPanel />);
    expect(screen.getByText('Type to search')).toBeInTheDocument();
    act(() => useSearchStore.setState({ text: 'zzz' }));
    expect(screen.getByText('No matches')).toBeInTheDocument();
  });

  it('forwards typing, suggestions and kind filters to the store', () => {
    useSearchStore.setState({ text: 'us', suggestions: ['user_service'] });
    render(<SearchPanel />);
    fireEvent.change(screen.getByLabelText('Search'), { target: { value: 'use' } });
    expect(setText).toHaveBeenCalledWith('use');
    fireEvent.click(screen.getByText('user_service'));
    expect(setText).toHaveBeenCalledWith('user_service');
    fireEvent.click(screen.getByText('class'));
    expect(toggleKind).toHaveBeenCalledWith('class');
  });

  it('names the filters in simple words', () => {
    usePlainWordsStore.setState({ simple: true });
    render(<SearchPanel />);
    for (const label of ['Folders', 'Files', 'Classes', 'Functions', 'Functions in classes']) expect(screen.getByText(label)).toBeInTheDocument();
    fireEvent.click(screen.getByText('Files'));
    expect(toggleKind).toHaveBeenCalledWith('module');
  });

  it('lists results and reveals with the keyboard or a click', () => {
    useSearchStore.setState({ text: 'user', results: [hit('User', 'class'), hit('get_user')] });
    render(<SearchPanel />);
    expect(screen.getAllByRole('option')).toHaveLength(2);
    const input = screen.getByLabelText('Search');
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(revealNode).toHaveBeenLastCalledWith('class:app/x.py::User');
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(revealNode).toHaveBeenLastCalledWith('function:app/x.py::get_user');
    fireEvent.click(screen.getByText('User'));
    expect(revealNode).toHaveBeenLastCalledWith('class:app/x.py::User');
  });

  it('lets the search bus focus the input', () => {
    render(<SearchPanel />);
    searchBus.focus();
    expect(screen.getByLabelText('Search')).toHaveFocus();
  });
});
