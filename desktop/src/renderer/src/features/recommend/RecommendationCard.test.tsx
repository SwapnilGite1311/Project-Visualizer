// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { type FakeBridge, installFakeBridge } from '../../api/fake-bridge';
import { RecommendationCard } from './RecommendationCard';

let fake: FakeBridge;

beforeEach(() => {
  fake = installFakeBridge();
  fake.invokeHandlers.set('pv:settings.get', (p) => (p as { fallback: unknown }).fallback);
});
afterEach(cleanup);

describe('RecommendationCard', () => {
  it('shows the verdict, confidence, reasons and actions', () => {
    render(<RecommendationCard input={{ change_preview: { risk: { score: 92, level: 'critical' } } }} />);
    expect(screen.getByText('No-go')).toBeTruthy();
    expect(screen.getByRole('meter', { name: 'Confidence' }).getAttribute('aria-valuenow')).toBe('80');
    expect(screen.getByText(/based on the data available/)).toBeTruthy();
    expect(screen.getByRole('list', { name: 'Reasons' }).textContent).toContain('critical');
    expect(screen.getByRole('list', { name: 'Actions' }).textContent).toContain('smaller steps');
    expect(screen.queryByRole('button', { name: 'Explain with AI' })).toBeNull(); // direct mode
  });

  it('offers an AI explanation in cloud mode', async () => {
    fake.invokeHandlers.set('pv:settings.get', (p) => ((p as { key: string }).key === 'ai.mode' ? 'cloud' : null));
    fake.invokeHandlers.set('pv:ml.recommend', () => ({ markdown: 'Because the checkout path fails.' }));
    render(<RecommendationCard input={{}} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Explain with AI' }));
    expect(await screen.findByText('Because the checkout path fails.')).toBeTruthy();
    expect(fake.invokeCalls.find((c) => c.channel === 'pv:ml.recommend')?.payload).toEqual({ input: {} });
  });
});
