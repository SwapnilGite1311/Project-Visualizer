import { create } from 'zustand';
import { invoke } from '../../api/bridge';
import { getAncestors } from '../../api/engine';
import { getSetting, setSetting } from '../../api/main';
import type { NodeStyle, Overlay } from '../../core/overlay';
import { useAppStore } from '../../core/store';
import { useRecommendInputs } from '../recommend/recommend-inputs';
import { type FailurePrediction, gatherLocalInputs, predictLocal } from './local-predict';

// contracts/http/ml/bottlenecks.response.schema.json
export interface Bottleneck {
  node_id: string;
  current_p95_ms: number;
  predicted_p95_ms: number;
  trend_ms_per_hour: number;
  load_sensitivity: number;
  confidence: number;
}
export type PredictionMethod = 'model' | 'heuristic' | 'local';
export interface TrainJob {
  job_id: string;
  status: 'queued' | 'running' | 'done' | 'failed';
  result?: { model_version?: string; samples?: number; metrics?: { auc?: number; method?: string } };
  error?: string;
}

interface PredictionState {
  method: PredictionMethod | null;
  predictions: FailurePrediction[];
  bottlenecks: Bottleneck[];
  cloudAvailable: boolean;
  cloudProject: string;
  job: TrainJob | null;
  loading: boolean;
  error: string | null;
  note: string | null;
  loadCloud(): Promise<void>;
  setCloudProject(id: string): Promise<void>;
  predict(): Promise<void>;
  train(): Promise<void>;
  clear(): void;
}

export const PREDICTION_OVERLAY = 'prediction';
export const POLL_MS = 3000;
const SHOWN_ABOVE = 0.2;

export const cloudProjectKey = (root: string) => `project.cloudProject.${root}`;

export function colorFor(probability: number): string | null {
  if (probability > 0.7) return '#ef4444';
  if (probability > 0.4) return '#f97316';
  if (probability > SHOWN_ABOVE) return '#eab308';
  return null;
}

// Each risky node and the modules that contain it; a container shows the riskiest thing inside it.
export function buildPredictionOverlay(predictions: FailurePrediction[], ancestors: Record<string, string[]>): Overlay {
  const best: Record<string, number> = {};
  for (const p of predictions) {
    if (p.probability <= SHOWN_ABOVE) continue;
    for (const id of [p.node_id, ...(ancestors[p.node_id] ?? [])]) best[id] = Math.max(best[id] ?? 0, p.probability);
  }
  const nodes: Record<string, NodeStyle> = {};
  for (const [id, probability] of Object.entries(best)) {
    nodes[id] = { color: colorFor(probability) ?? undefined, badge: `${Math.round(probability * 100)}%` };
  }
  return { priority: 25, nodes, edges: {} };
}

const message = (e: unknown) => (e instanceof Error ? e.message : String(e));
let pollTimer: ReturnType<typeof setTimeout> | null = null;
const stopPolling = () => {
  if (pollTimer) clearTimeout(pollTimer);
  pollTimer = null;
};

export const usePredictionStore = create<PredictionState>()((set, get) => {
  const publish = async (projectId: string, method: PredictionMethod, predictions: FailurePrediction[]) => {
    const risky = predictions.filter((p) => p.probability > SHOWN_ABOVE);
    const ancestors: Record<string, string[]> = {};
    await Promise.all(
      risky.map(async (p) => {
        ancestors[p.node_id] = (await getAncestors(projectId, p.node_id).catch(() => [])).map((n) => n.id);
      }),
    );
    useAppStore.getState().setOverlay(PREDICTION_OVERLAY, buildPredictionOverlay(predictions, ancestors));
    useRecommendInputs.getState().setFailurePredictions({
      method,
      predictions: predictions.map((p) => ({ node_id: p.node_id, probability: p.probability })),
    });
  };

  const poll = (jobId: string) => {
    stopPolling();
    pollTimer = setTimeout(async () => {
      pollTimer = null;
      try {
        const job = await invoke<TrainJob>('pv:ml.job', { job_id: jobId });
        set({ job: { ...job, job_id: jobId } });
        if (job.status === 'queued' || job.status === 'running') poll(jobId);
      } catch (e) {
        set({ error: message(e) });
      }
    }, POLL_MS);
  };

  return {
    method: null,
    predictions: [],
    bottlenecks: [],
    cloudAvailable: false,
    cloudProject: '',
    job: null,
    loading: false,
    error: null,
    note: null,

    async loadCloud() {
      const root = useAppStore.getState().projectRoot;
      const cloudAvailable = await invoke<boolean>('pv:ml.available').catch(() => false);
      const cloudProject = root ? await getSetting<string>(cloudProjectKey(root), '').catch(() => '') : '';
      set({ cloudAvailable, cloudProject: cloudProject ?? '' });
    },

    async setCloudProject(id) {
      const root = useAppStore.getState().projectRoot;
      set({ cloudProject: id });
      if (root) await setSetting(cloudProjectKey(root), id);
    },

    async predict() {
      const pid = useAppStore.getState().projectId;
      if (!pid) return;
      set({ loading: true, error: null, note: null });
      const { cloudAvailable, cloudProject } = get();
      try {
        if (cloudAvailable && cloudProject) {
          try {
            const ids = { project_id: pid, cloud_project_id: cloudProject };
            const [failures, slow] = await Promise.all([
              invoke<{ predictions: FailurePrediction[]; method: 'model' | 'heuristic' }>('pv:ml.predictFailures', ids),
              invoke<{ bottlenecks: Bottleneck[] }>('pv:ml.predictBottlenecks', ids).catch(() => ({ bottlenecks: [] })),
            ]);
            const predictions = [...failures.predictions].sort((a, b) => b.probability - a.probability);
            set({ method: failures.method, predictions, bottlenecks: slow.bottlenecks, loading: false });
            await publish(pid, failures.method, predictions);
            return;
          } catch (e) {
            set({ note: `The cloud prediction failed (${message(e)}); showing the local estimate.` });
          }
        }
        const predictions = predictLocal(await gatherLocalInputs(pid));
        set({ method: 'local', predictions, bottlenecks: [], loading: false });
        await publish(pid, 'local', predictions);
      } catch (e) {
        set({ loading: false, error: message(e) });
      }
    },

    async train() {
      const pid = useAppStore.getState().projectId;
      const { cloudProject } = get();
      if (!pid || !cloudProject) return;
      set({ error: null });
      try {
        const { job_id } = await invoke<{ job_id: string }>('pv:ml.train', { project_id: pid, cloud_project_id: cloudProject });
        set({ job: { job_id, status: 'queued' } });
        poll(job_id);
      } catch (e) {
        set({ error: message(e) });
      }
    },

    clear() {
      stopPolling();
      useAppStore.getState().setOverlay(PREDICTION_OVERLAY, null);
      useRecommendInputs.getState().setFailurePredictions(null);
      set({ method: null, predictions: [], bottlenecks: [], job: null, error: null, note: null });
    },
  };
});
