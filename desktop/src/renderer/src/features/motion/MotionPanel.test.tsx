// @vitest-environment jsdom
import { act, fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAppStore } from '../../core/store';
import { MotionPanel } from './MotionPanel';
import { useMotionStore } from './motion-store';
import { numbered, step } from './test-data';

vi.mock('./motion-api', () => ({
  findPython: vi.fn(async () => ({ command: 'py', args: ['-3'], version: '3.12.4', executable: 'C:/py.exe' })),
  getSteps: vi.fn(),
  loadTrace: vi.fn(),
  recordRun: vi.fn(),
  unloadTrace: vi.fn(async () => ({ removed: true })),
  cancelRecording: vi.fn(),
  pickTraceFile: vi.fn(),
}));
vi.mock('../../view/reveal', () => ({ revealNode: vi.fn(async () => undefined) }));

beforeEach(() => {
  useAppStore.setState({ projectId: 'p1', projectRoot: 'C:/code/demo' });
  useMotionStore.getState().close();
  useMotionStore.setState({ python: undefined, command: 'main.py', mode: 'map' });
});

describe('MotionPanel', () => {
  it('shows the Python status and starts a recording', async () => {
    const record = vi.fn(async () => undefined);
    useMotionStore.setState({ record });
    render(<MotionPanel />);
    expect(await screen.findByText('Python 3.12.4 found')).toBeInTheDocument();
    expect(screen.getByText('This runs your program on your computer, like running it in a terminal.')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Command'), { target: { value: '-m pytest tests' } });
    expect(useMotionStore.getState().command).toBe('-m pytest tests');
    fireEvent.click(screen.getByText('Record and play'));
    expect(record).toHaveBeenCalled();
  });

  it('shows the transport, variables and call stack of the current step', () => {
    const steps = numbered([
      step('call', 'function:main.py#main', 0, 7),
      step('call', 'method:app/services.py#UserService.get_user', 1, 8, { user_id: '1' }),
      step('line', 'method:app/services.py#UserService.get_user', 1, 11, { user: '<User>' }),
    ]);
    render(<MotionPanel />);
    act(() => useMotionStore.getState().loadWalkthrough(steps));
    act(() => useMotionStore.getState().seek(2));
    expect(screen.getByText('Step 3 of 3')).toBeInTheDocument();
    expect(screen.getByText('Variables in UserService.get_user')).toBeInTheDocument();
    expect(screen.getByText('<User>').closest('tr')).toHaveAttribute('data-changed', 'true');
    expect(screen.getByText('user_id').closest('tr')).not.toHaveAttribute('data-changed');
    const stack = screen.getByRole('list', { name: 'Call stack' });
    expect(stack.textContent).toMatch(/UserService\.get_user.*main/);
    act(() => useMotionStore.getState().stepBack());
    expect(screen.getByText('Step 2 of 3')).toBeInTheDocument();
  });

  it('shows errors with a way back', () => {
    render(<MotionPanel />);
    act(() => useMotionStore.setState({ status: 'error', error: "can't open file 'main.py'" }));
    expect(screen.getByText("can't open file 'main.py'")).toBeInTheDocument();
    fireEvent.click(screen.getByText('Back'));
    expect(useMotionStore.getState().status).toBe('idle');
  });
});
