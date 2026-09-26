// Channels: pv:ml.available; pv:ml.train {project_id, cloud_project_id} → {job_id}; pv:ml.job {job_id};
// pv:ml.predictFailures / pv:ml.predictBottlenecks {project_id, cloud_project_id}; pv:ml.forecast {series, horizon, step_ms};
// pv:ml.recommend {input}; pv:ml.anomalies {series} (works offline too).
// The ML models run on the server (ML gateway → Python AI service); the desktop sends per-minute statistics only.
import type { MainContext } from '../core/context';
import { CloudClient } from '../cloud/cloud-client';
import { detectLocal, type SeriesPoint } from '../ml/anomaly-local';
import { exportRows } from '../ml/dataset';

const HOUR = 3_600_000;

export function cloudClientFor(ctx: MainContext): CloudClient {
  return new CloudClient({
    baseUrl: () => ctx.settings.get('cloud.url', 'http://localhost:8080'),
    getTokens: () => {
      const access = ctx.secrets.get('cloud.accessToken');
      const refresh = ctx.secrets.get('cloud.refreshToken');
      return access && refresh ? { access, refresh } : null;
    },
    setTokens: (t) => {
      if (t) {
        ctx.secrets.set('cloud.accessToken', t.access);
        ctx.secrets.set('cloud.refreshToken', t.refresh);
      } else {
        ctx.secrets.delete('cloud.accessToken');
        ctx.secrets.delete('cloud.refreshToken');
      }
    },
  });
}

function str(p: unknown, key: string): string {
  const v = (p as Record<string, unknown> | null)?.[key];
  if (typeof v !== 'string' || !v) throw new Error(`${key} is required`);
  return v;
}

export default function register(ctx: MainContext, client: CloudClient = cloudClientFor(ctx)): void {
  const rows = (p: unknown, sinceMs?: number) => exportRows(ctx.engine, str(p, 'project_id'), sinceMs);
  const project = (p: unknown) => encodeURIComponent(str(p, 'cloud_project_id'));

  ctx.handle('pv:ml.available', () => client.signedIn());
  ctx.handle('pv:ml.train', async (p) => client.request('POST', `/api/ml/projects/${project(p)}/train`, { rows: await rows(p) }));
  ctx.handle('pv:ml.job', (p) => client.request('GET', `/api/ml/jobs/${encodeURIComponent(str(p, 'job_id'))}`));
  ctx.handle('pv:ml.predictFailures', async (p) =>
    client.request('POST', `/api/ml/projects/${project(p)}/predict/failures`, { rows: await rows(p, Date.now() - 2 * HOUR) }),
  );
  ctx.handle('pv:ml.predictBottlenecks', async (p) =>
    client.request('POST', `/api/ml/projects/${project(p)}/predict/bottlenecks`, { rows: await rows(p, Date.now() - 24 * HOUR) }),
  );
  ctx.handle('pv:ml.forecast', (p) => client.request('POST', '/api/ml/forecast', p));
  ctx.handle('pv:ml.recommend', (p) => client.request('POST', '/api/ml/recommend', (p as { input?: unknown } | null)?.input ?? {}));
  ctx.handle('pv:ml.anomalies', async (p) => {
    const series = ((p as { series?: unknown } | null)?.series ?? []) as Array<{ node_id: string; metric: string; points: SeriesPoint[] }>;
    if (client.signedIn()) {
      try {
        return await client.request('POST', '/api/ml/anomaly', { series });
      } catch (e) {
        ctx.log('warn', 'cloud anomaly detection failed; using the local one', String(e));
      }
    }
    return { results: series.map((s) => ({ node_id: s.node_id, metric: s.metric, anomalies: detectLocal(s.points) })) };
  });
}
