// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { gnode } from '../../view/test-data';
import { NodeDetails } from './NodeDetails';

describe('NodeDetails', () => {
  it('shows all fields of a function', () => {
    const node = {
      ...gnode('function:app/utils.py#is_valid', 'function'),
      qualified_name: 'app.utils.is_valid',
      file_path: 'app/utils.py',
      span: { start_line: 8, start_col: 0, end_line: 9, end_col: 0 },
      metrics: { loc: 2, complexity: 2, fan_in: 3, fan_out: 0 },
    };
    render(<NodeDetails node={node} />);
    expect(screen.getByRole('heading', { name: 'is_valid' })).toBeInTheDocument();
    expect(screen.getByText('function')).toBeInTheDocument();
    expect(screen.getByText('app.utils.is_valid')).toBeInTheDocument();
    expect(screen.getByTestId('node-location')).toHaveTextContent('app/utils.py:8–9');
    expect(screen.getByText('Used by (fan-in)').nextSibling).toHaveTextContent('3');
  });

  it('hides the location for a package', () => {
    render(<NodeDetails node={gnode('package:app', 'package')} />);
    expect(screen.queryByTestId('node-location')).toBeNull();
  });
});
