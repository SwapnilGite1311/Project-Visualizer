// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getAncestors } from '../../api/engine';
import { useAppStore } from '../../core/store';
import { gnode } from '../../view/test-data';
import { Breadcrumb } from './Breadcrumb';

vi.mock('../../api/engine', () => ({ getAncestors: vi.fn() }));

beforeEach(() => {
  useAppStore.setState(useAppStore.getInitialState());
  useAppStore.getState().openedProject('p1', 'C:/code/demo');
  useAppStore.getState().setParent('module:app/models.py');
});

describe('Breadcrumb', () => {
  it('shows the path and navigates to an ancestor', async () => {
    vi.mocked(getAncestors).mockResolvedValue([
      gnode('project:', 'project'),
      gnode('package:app', 'package'),
      gnode('module:app/models.py', 'module'),
    ]);
    render(<Breadcrumb />);
    expect(await screen.findByText('demo')).toBeInTheDocument();
    expect(screen.getByText('app')).toBeInTheDocument();
    expect(screen.getByText('models.py')).toHaveAttribute('aria-current', 'page');
    fireEvent.click(screen.getByText('demo'));
    expect(useAppStore.getState().currentParentId).toBe('project:');
  });

  it('collapses long paths', async () => {
    vi.mocked(getAncestors).mockResolvedValue(
      ['project:', 'package:a', 'package:a/b', 'package:a/b/c', 'package:a/b/c/d', 'module:a/b/c/d/x.py'].map((id, i) =>
        gnode(id, i === 0 ? 'project' : 'package'),
      ),
    );
    render(<Breadcrumb />);
    expect(await screen.findByText('…')).toBeInTheDocument();
    expect(screen.queryByText('a')).not.toBeInTheDocument();
  });
});
