// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { SummaryCards } from './SummaryCards';
import { sampleSummary } from './test-data';

describe('SummaryCards', () => {
  it('renders the numbers', () => {
    render(<SummaryCards summary={sampleSummary} />);
    expect(screen.getByText('12')).toBeInTheDocument();
    expect(screen.getByText('1,450')).toBeInTheDocument();
    expect(screen.getByText('4')).toBeInTheDocument();
    expect(screen.getByText('29')).toBeInTheDocument();
    expect(screen.getByText('External libraries').parentElement).toHaveAttribute('title', 'flask, requests');
  });

  it('lists the files with syntax errors on click', () => {
    render(<SummaryCards summary={sampleSummary} />);
    expect(screen.queryByText('app/broken.py')).toBeNull();
    fireEvent.click(screen.getByText('Files with syntax errors'));
    expect(screen.getByText('app/broken.py')).toBeInTheDocument();
  });
});
