// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { type FakeBridge, installFakeBridge } from '../../api/fake-bridge';
import { createRegistry } from '../../core/registry';
import { useAppStore } from '../../core/store';
import { ForecastChart } from './ForecastChart';
import { ForecastPanel } from './ForecastPanel';
import { HOUR, useForecastStore } from './forecast-store';
import register from './register';

const history = Array.from({ length: 48 }, (_, i) => ({ t: 1_700_000_000_000 + i * HOUR, v: 0.01 + (i % 5) * 0.002 }));
const forecast = Array.from({ length: 24 }, (_, i) => ({ t: history[47].t + (i + 1) * HOUR, v: 0.02, lower: 0.01, upper: 0.03 }));

let fake: FakeBridge;

beforeEach(() => {
  fake = installFakeBridge();
  fake.invokeHandlers.set('pv:ml.available', () => false);
  fake.invokeHandlers.set('pv:ml.anomalies', () => ({ results: [] }));
  fake.rpcHandlers.set('metrics.series', (p) => {
    const metric = (p as { metric: string }).metric;
    if (metric === 'calls') return { points: history.map((h) => ({ t: h.t, v: 10 })) };
    return { points: metric === 'error_rate' ? history : history.map((h) => ({ t: h.t, v: 0 })) };
  });
  useAppStore.setState(useAppStore.getInitialState());
  useForecastStore.getState().clear();
});
afterEach(cleanup);

describe('forecast chart', () => {
  it('draws history, a dashed forecast, the band and 12-hour labels', () => {
    const { container } = render(<ForecastChart metric="error_rate" history={history} forecast={forecast} subject="load" />);
    expect(screen.getByRole('img', { name: /Error rate \(%\) of load: 48 hours of history and a 24-hour forecast/ })).toBeTruthy();
    expect(container.querySelector('[data-part="history"]')).toBeTruthy();
    expect(container.querySelector('[data-part="forecast"]')?.getAttribute('stroke-dasharray')).toBe('6 4');
    expect(container.querySelector('[data-part="band"]')).toBeTruthy();
    // 71 hours → 5 or 6 labels at 12-hour marks
    expect(container.querySelectorAll('[data-tick]').length).toBeGreaterThanOrEqual(5);
    expect(screen.getByText('Error rate (%)')).toBeTruthy();
  });

  it('marks one anomaly with one red dot', () => {
    const { container } = render(<ForecastChart metric="p95_ms" history={history} forecast={[]} anomalies={[{ t: history[10].t, v: 250 }]} />);
    const dots = container.querySelectorAll('[data-part="anomaly"]');
    expect(dots).toHaveLength(1);
    expect(dots[0].querySelector('title')?.textContent).toBe('Unusual: 250 ms');
  });
});

describe('forecast panel', () => {
  it('says when an element has no history', async () => {
    fake.rpcHandlers.set('metrics.series', () => ({ points: history.map((h) => ({ t: h.t, v: 0 })) }));
    act(() => useAppStore.getState().openedProject('p1', 'C:/app'));
    act(() => useAppStore.getState().select('function:app/a.py#idle'));
    render(<ForecastPanel />);
    await waitFor(() => expect(screen.getByText('No history for this element yet')).toBeTruthy());
  });

  it('registers the panel and the command', () => {
    const r = createRegistry();
    register(r);
    expect(r.panels('right')).toEqual([expect.objectContaining({ id: 'forecast', title: 'Forecast', order: 50 })]);
    expect(r.commands().map((c) => c.id)).toEqual(['forecast.refresh']);
  });

  it('forecasts the selected element and switches metrics', async () => {
    act(() => useAppStore.getState().openedProject('p1', 'C:/app'));
    render(<ForecastPanel />);
    expect(screen.getByText('Select an element to see its forecast')).toBeTruthy();
    act(() => useAppStore.getState().select('function:app/a.py#load'));
    await waitFor(() => expect(screen.getByRole('img', { name: /Error rate/ })).toBeTruthy());
    expect(screen.getByText('Warning')).toBeTruthy();
    expect(screen.getByText('confidence 100%')).toBeTruthy();
    fireEvent.click(screen.getByRole('tab', { name: 'Latency' }));
    expect(screen.getByRole('img', { name: /Latency P95 \(ms\) of load/ })).toBeTruthy();
    expect(screen.getByText('Healthy')).toBeTruthy();
  });
});
