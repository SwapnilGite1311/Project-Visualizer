// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useImportStore } from './import-store';
import { ProgressView } from './ProgressView';

describe('ProgressView', () => {
  it('shows parsing progress', () => {
    useImportStore.setState({
      loading: true,
      root: 'C:/code/demo',
      progress: { project_id: 'p1', state: 'parsing', files_total: 340, files_done: 12 },
    });
    render(<ProgressView />);
    expect(screen.getByText('Reading code… 12 / 340 files')).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '12');
  });

  it('renders nothing when not loading', () => {
    useImportStore.setState({ loading: false });
    const { container } = render(<ProgressView />);
    expect(container).toBeEmptyDOMElement();
  });
});
