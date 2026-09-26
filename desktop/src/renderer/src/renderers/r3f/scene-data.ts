import type { ViewGraph } from '../../view/model';

// Pure scene data for the 3D view: flat typed arrays for instanced drawing plus a little metadata per node/edge.
// Positions come from the engine's 3D force layout, scaled to a size that depends on the node count so that
// spacing stays readable; nodes without a position are placed on a sphere (Fibonacci) around the rest.

export const BACKGROUND = '#0b1020';

export interface SceneNodeMeta {
  id: string;
  label: string;
  badge: string;
  canOpen: boolean;
  pulse: boolean;
  ring: string | null; // overlay border colour (health ring, risk ring) when it differs from the fill
  radius: number;
}
export interface SceneEdgeMeta {
  id: string;
  source: number; // node index
  target: number;
  animated: boolean;
  width: number;
}
export interface SceneData {
  ids: string[];
  nodes: SceneNodeMeta[];
  positions: Float32Array; // xyz per node
  colors: Float32Array; // rgb per node (0..1), dimmed toward the background by the node's opacity
  sizes: Float32Array; // radius per node
  segments: Float32Array; // two xyz points per edge (centre to centre)
  edgeColors: Float32Array; // rgb per edge, dimmed by the edge's opacity
  edges: SceneEdgeMeta[];
  center: [number, number, number];
  radius: number; // bounding sphere including node radii
}

export function parseColor(hex: string): [number, number, number] {
  const h = hex.trim().replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h.slice(0, 6);
  const n = Number.parseInt(full, 16);
  if (!/^[0-9a-f]{6}$/i.test(full) || Number.isNaN(n)) return [0.6, 0.6, 0.6];
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

const BG = parseColor(BACKGROUND);
export function dim(rgb: [number, number, number], opacity: number): [number, number, number] {
  const o = Math.min(1, Math.max(0, opacity));
  return [rgb[0] * o + BG[0] * (1 - o), rgb[1] * o + BG[1] * (1 - o), rgb[2] * o + BG[2] * (1 - o)];
}

// Node radius from the view size (30..80, from lines of code): 2.2 .. 5.2 scene units.
export const radiusOf = (size: number) => 2.2 + (3 * Math.min(50, Math.max(0, size - 30))) / 50;

// How far apart the layout is spread: about the same space per node at every level.
export const spreadFor = (n: number) => 22 * Math.cbrt(Math.max(1, n)) + 18;

export function fibonacciSphere(i: number, n: number, r: number): [number, number, number] {
  const y = n <= 1 ? 0 : 1 - (2 * (i + 0.5)) / n;
  const ring = Math.sqrt(Math.max(0, 1 - y * y));
  const theta = Math.PI * (3 - Math.sqrt(5)) * i;
  return [Math.cos(theta) * ring * r, y * r, Math.sin(theta) * ring * r];
}

export function toScene(graph: ViewGraph): SceneData {
  const n = graph.nodes.length;
  const ids = graph.nodes.map((v) => v.id);
  const index = new Map(ids.map((id, i) => [id, i]));
  const positions = new Float32Array(n * 3);
  const colors = new Float32Array(n * 3);
  const sizes = new Float32Array(n);

  // Scale the engine layout (centred on its mean) so its farthest node sits at spreadFor(n).
  const given = graph.nodes.map((v) => graph.positions?.[v.id]);
  const placed = given.filter((p): p is NonNullable<typeof p> => Boolean(p));
  const mean = [0, 0, 0];
  for (const p of placed) {
    mean[0] += p.x / placed.length;
    mean[1] += p.y / placed.length;
    mean[2] += (p.z ?? 0) / placed.length;
  }
  // A force layout pushes unlinked elements far out; scaling by the farthest one would shrink everything else. Scale
  // by the 85th-percentile distance instead and pull the few outliers in to just outside the rest.
  const dists = placed.map((p) => Math.hypot(p.x - mean[0], p.y - mean[1], (p.z ?? 0) - mean[2])).sort((a, b) => a - b);
  const typical = dists.length ? dists[Math.min(dists.length - 1, Math.floor(dists.length * 0.85))] : 0;
  const spread = spreadFor(n);
  const scale = typical > 1e-9 ? spread / typical : 1;
  const limit = spread * 1.25;
  const missing = given.map((p, i) => (p ? -1 : i)).filter((i) => i >= 0);

  const nodes: SceneNodeMeta[] = graph.nodes.map((v, i) => {
    const p = given[i];
    let xyz: [number, number, number] = p
      ? [(p.x - mean[0]) * scale, -(p.y - mean[1]) * scale, ((p.z ?? 0) - mean[2]) * scale]
      : fibonacciSphere(missing.indexOf(i), missing.length, placed.length ? spread * 1.15 : spread);
    const len = Math.hypot(...xyz);
    if (p && len > limit) xyz = xyz.map((c) => (c / len) * limit) as [number, number, number];
    positions.set(xyz, i * 3);
    colors.set(dim(parseColor(v.color), v.opacity), i * 3);
    const radius = radiusOf(v.size);
    sizes[i] = radius;
    const ring = v.borderColor && v.borderColor.toLowerCase() !== v.color.toLowerCase() ? v.borderColor : null;
    return { id: v.id, label: v.label, badge: v.badge, canOpen: v.hasChildren, pulse: v.pulse, ring, radius };
  });

  const edges: SceneEdgeMeta[] = [];
  const segs: number[] = [];
  const ecols: number[] = [];
  for (const e of graph.edges) {
    const s = index.get(e.source);
    const t = index.get(e.target);
    if (s === undefined || t === undefined || s === t) continue;
    edges.push({ id: e.id, source: s, target: t, animated: e.animated, width: e.width });
    segs.push(positions[s * 3], positions[s * 3 + 1], positions[s * 3 + 2], positions[t * 3], positions[t * 3 + 1], positions[t * 3 + 2]);
    ecols.push(...dim(parseColor(e.color), e.opacity));
  }

  let cx = 0;
  let cy = 0;
  let cz = 0;
  for (let i = 0; i < n; i++) {
    cx += positions[i * 3] / n;
    cy += positions[i * 3 + 1] / n;
    cz += positions[i * 3 + 2] / n;
  }
  let radius = 0;
  for (let i = 0; i < n; i++) {
    radius = Math.max(radius, Math.hypot(positions[i * 3] - cx, positions[i * 3 + 1] - cy, positions[i * 3 + 2] - cz) + sizes[i]);
  }
  return {
    ids,
    nodes,
    positions,
    colors,
    sizes,
    segments: new Float32Array(segs),
    edgeColors: new Float32Array(ecols),
    edges,
    center: n ? [cx, cy, cz] : [0, 0, 0],
    radius: Math.max(radius, 10),
  };
}

// The nodes and edges around one node (for hover/selection focus): the node, its direct neighbours, their edges.
export function neighbourhood(scene: SceneData, nodeIndex: number): { nodes: Set<number>; edges: Set<number> } {
  const nodes = new Set<number>([nodeIndex]);
  const edges = new Set<number>();
  scene.edges.forEach((e, i) => {
    if (e.source === nodeIndex || e.target === nodeIndex) {
      edges.add(i);
      nodes.add(e.source);
      nodes.add(e.target);
    }
  });
  return { nodes, edges };
}

// Which labels to draw: all of them on small levels; on big ones the largest nodes plus the focused ones.
export const MAX_LABELS = 90;
export function labelIndices(scene: SceneData, focus: Set<number>): number[] {
  const n = scene.ids.length;
  if (n <= MAX_LABELS) return [...Array(n).keys()];
  const bySize = [...Array(n).keys()].sort((a, b) => scene.sizes[b] - scene.sizes[a]).slice(0, MAX_LABELS - Math.min(focus.size, 30));
  return [...new Set([...focus, ...bySize])].slice(0, MAX_LABELS);
}

// Camera distance that fits a bounding sphere in view (vertical field of view in degrees, width/height aspect).
export function fitDistance(radius: number, fovDeg: number, aspect: number, padding = 1.12): number {
  const vFov = (fovDeg * Math.PI) / 180;
  const hFov = 2 * Math.atan(Math.tan(vFov / 2) * Math.max(0.1, aspect));
  const limiting = Math.min(vFov, hFov);
  return (radius * padding) / Math.sin(limiting / 2);
}

// The camera distance (from the scene centre, along `dir`) at which every node, with its radius and some room for
// its label, is inside the view — a tight frame, unlike a bounding sphere that leaves the corners empty.
export function frameDistance(scene: SceneData, dir: [number, number, number], fovDeg: number, aspect: number, padding = 1.1): number {
  const [dx, dy, dz] = dir;
  const dl = Math.hypot(dx, dy, dz) || 1;
  const f = [dx / dl, dy / dl, dz / dl];
  // The camera sits at centre + f·d looking back at the centre: right = (-f) × worldUp, up = f × right.
  let rx = f[2];
  let rz = -f[0];
  const rl = Math.hypot(rx, rz) || 1;
  rx /= rl;
  rz /= rl;
  const ux = f[1] * rz;
  const uy = f[2] * rx - f[0] * rz;
  const uz = -f[1] * rx;
  const tanV = Math.tan((fovDeg * Math.PI) / 360);
  const tanH = tanV * Math.max(0.1, aspect);
  let need = 1;
  for (let i = 0; i < scene.ids.length; i++) {
    const px = scene.positions[i * 3] - scene.center[0];
    const py = scene.positions[i * 3 + 1] - scene.center[1];
    const pz = scene.positions[i * 3 + 2] - scene.center[2];
    const depth = px * f[0] + py * f[1] + pz * f[2]; // toward the camera
    const x = Math.abs(px * rx + pz * rz) + scene.sizes[i] * 2;
    const y = Math.abs(px * ux + py * uy + pz * uz) + scene.sizes[i] * 2.6; // label above
    need = Math.max(need, depth + (x * padding) / tanH, depth + (y * padding) / tanV, depth + scene.sizes[i] * 3);
  }
  return need;
}

// Share of the smaller view side covered by a sphere of `radius` at `distance` (perspective projection).
export function screenShare(radius: number, distance: number, fovDeg: number, aspect: number): number {
  if (distance <= radius) return 1;
  const vFov = (fovDeg * Math.PI) / 180;
  const verticalShare = radius / (distance * Math.tan(vFov / 2)); // diameter / view height
  return aspect >= 1 ? verticalShare : verticalShare / Math.max(0.1, aspect);
}
