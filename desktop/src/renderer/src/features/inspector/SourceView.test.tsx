// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getSource } from '../../api/engine';
import { openInEditor } from '../../api/main';
import { useAppStore } from '../../core/store';
import { gnode } from '../../view/test-data';
import { SourceView } from './SourceView';

vi.mock('../../api/engine', () => ({ getSource: vi.fn() }));
vi.mock('../../api/main', () => ({ openInEditor: vi.fn(async () => 'vscode') }));

beforeEach(() => {
  useAppStore.setState(useAppStore.getInitialState());
  useAppStore.getState().openedProject('p1', 'C:/code/demo');
});

const fn = {
  ...gnode('function:app/utils.py#normalize', 'function'),
  file_path: 'app/utils.py',
  span: { start_line: 4, start_col: 0, end_line: 5, end_col: 0 },
};

describe('SourceView', () => {
  it('shows highlighted code with line numbers starting at the node', async () => {
    vi.mocked(getSource).mockResolvedValue({
      file_path: 'app/utils.py',
      language: 'python',
      text: 'def normalize(name):\n    return name.strip().lower()',
      span: fn.span,
    });
    render(<SourceView node={fn} />);
    const code = await screen.findByTestId('source-code');
    expect(code).toHaveTextContent('def normalize(name):');
    expect(code.querySelector('.hljs-keyword')).not.toBeNull();
    const numbers = [...code.querySelectorAll('div > span:first-child')].map((s) => s.textContent);
    expect(numbers).toEqual(['4', '5']);
    fireEvent.click(screen.getByText('Open in editor'));
    expect(openInEditor).toHaveBeenCalledWith('C:/code/demo/app/utils.py', 4);
  });

  it('has no source for a package', () => {
    render(<SourceView node={gnode('package:app', 'package')} />);
    expect(screen.getByText('No source for this element')).toBeInTheDocument();
  });
});
