// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { createRegistry } from '../../core/registry';
import { useAppStore } from '../../core/store';
import { useInputsStore } from './inputs-store';
import register, { NotesButton } from './register';

describe('inputs feature', () => {
  it('registers entry points', () => {
    const r = createRegistry();
    register(r);
    expect(r.welcomeActions().map((a) => a.id)).toEqual(['snippet']);
    expect(r.toolbarItems('right').map((t) => t.id)).toEqual(['project-notes']);
    expect(r.commands().map((c) => c.id).sort()).toEqual(['project.notes', 'project.pasteSnippet']);
    expect(r.globals().map((g) => g.id).sort()).toEqual(['project-notes-dialog', 'snippet-dialog']);
    void r.welcomeActions()[0].run();
    expect(useInputsStore.getState().snippetOpen).toBe(true);
  });

  it('shows the notes button only with an open project', () => {
    useAppStore.setState({ projectId: null });
    const { rerender } = render(<NotesButton />);
    expect(screen.queryByLabelText('Project notes')).toBeNull();
    useAppStore.setState({ projectId: 'p1' });
    rerender(<NotesButton />);
    expect(screen.getByLabelText('Project notes')).toBeInTheDocument();
  });
});
