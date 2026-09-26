// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { type FakeBridge, installFakeBridge } from '../../api/fake-bridge';
import type { NodeRef } from '../../core/registry';
import { useAppStore } from '../../core/store';
import { ChangeDialog } from './ChangeDialog';
import { useChangeStore } from './change-store';

let fake: FakeBridge;
const node: NodeRef = { id: 'function:app/utils.py#is_valid', kind: 'function', name: 'is_valid', file_path: 'app/utils.py' } as NodeRef;

beforeEach(() => {
  fake = installFakeBridge();
  useAppStore.setState(useAppStore.getInitialState());
  useChangeStore.setState(useChangeStore.getInitialState());
  useAppStore.getState().openedProject('p1', 'C:/x');
  fake.rpcHandlers.set('change.preview', () => ({ change: {}, affected: [], risk: { score: 1, level: 'low', factors: [] }, breakdown: {} }));
  fake.rpcHandlers.set('graph.ancestors', () => ({ nodes: [] }));
  fake.rpcHandlers.set('search.query', () => ({ results: [{ node_id: 'package:lib', name: 'lib', kind: 'package', file_path: '', qualified_name: 'lib', score: 1 }] }));
});

afterEach(cleanup);

describe('ChangeDialog', () => {
  it('needs a new name before previewing a rename', async () => {
    render(<ChangeDialog />);
    act(() => useChangeStore.getState().openDialog(node));
    expect(await screen.findByText('Preview a change to is_valid')).toBeTruthy();
    fireEvent.click(screen.getByLabelText('Rename it'));
    const previewButton = screen.getByRole('button', { name: 'Preview' }) as HTMLButtonElement;
    expect(previewButton.disabled).toBe(true);
    fireEvent.change(screen.getByLabelText('New name'), { target: { value: 'is_ok' } });
    fireEvent.click(previewButton);
    await new Promise((r) => setTimeout(r, 0));
    const call = fake.rpcCalls.find((c) => c.method === 'change.preview');
    expect(call?.params).toMatchObject({ change: { kind: 'rename', new_name: 'is_ok' } });
    expect(useChangeStore.getState().dialogFor).toBeNull();
  });

  it('previews deleting right away', async () => {
    render(<ChangeDialog />);
    act(() => useChangeStore.getState().openDialog(node));
    fireEvent.click(await screen.findByLabelText('Delete it'));
    fireEvent.click(screen.getByRole('button', { name: 'Preview' }));
    await new Promise((r) => setTimeout(r, 0));
    expect(fake.rpcCalls.find((c) => c.method === 'change.preview')?.params).toMatchObject({ change: { kind: 'delete' } });
  });
});
