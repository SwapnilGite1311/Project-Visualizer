import { OrbitControls } from '@react-three/drei';
import { Canvas, type ThreeEvent, useFrame, useThree } from '@react-three/fiber';
import { type MutableRefObject, useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import type { ZoomHint } from '../../view/semantic-zoom';
import { BACKGROUND, frameDistance, labelIndices, neighbourhood, parseColor, type SceneData } from './scene-data';

export type NodeEventName = 'nodeClick' | 'nodeDoubleClick' | 'nodeContext' | 'nodeHover';
type At = { clientX: number; clientY: number };

// What the imperative renderer needs from the live scene (camera, controls, view size).
export interface SceneBridge {
  camera: THREE.PerspectiveCamera | null;
  controls: { target: THREE.Vector3; update(): void } | null;
  size: { width: number; height: number };
  fitDistance: number;
}

export interface SceneState {
  scene: SceneData | null;
  selected: string | null;
  hovered: string | null;
  fitRequest: number;
  focusRequest: number; // bumped by select(): glide to the selected node
  hint: ZoomHint | null;
}

export interface GraphSceneProps {
  state: SceneState;
  bridge: MutableRefObject<SceneBridge>;
  onNode(event: NodeEventName, nodeId: string | null, at: At): void;
  onBackground(at: At): void;
  onFitted(distance: number): void;
}

const SELECTED = '#fbbf24';
const BG = parseColor(BACKGROUND);
const UP = new THREE.Vector3(0, 1, 0);
const VIEW_DIR = new THREE.Vector3(0.32, 0.42, 1).normalize();
const VIEW_DIR_ARRAY: [number, number, number] = [VIEW_DIR.x, VIEW_DIR.y, VIEW_DIR.z];
const EDGE_LEGEND: Array<[string, string]> = [
  ['imports', '#64748b'],
  ['calls', '#22c55e'],
  ['inherits', '#f97316'],
  ['references', '#a855f7'],
];

const mix = (c: ArrayLike<number>, k: number, i = 0): [number, number, number] => [
  c[i] * k + BG[0] * (1 - k),
  c[i + 1] * k + BG[1] * (1 - k),
  c[i + 2] * k + BG[2] * (1 - k),
];

// The node and edges around the hovered (else selected) node; everything else fades so its links stand out.
function useFocus(scene: SceneData | null, hovered: string | null, selected: string | null) {
  return useMemo(() => {
    if (!scene) return null;
    const id = hovered ?? selected;
    const i = id ? scene.ids.indexOf(id) : -1;
    return i >= 0 ? { index: i, ...neighbourhood(scene, i) } : null;
  }, [scene, hovered, selected]);
}
type Focus = ReturnType<typeof useFocus>;

function Nodes({ scene, focus, selected, onNode }: { scene: SceneData; focus: Focus; selected: number; onNode: GraphSceneProps['onNode'] }) {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const halo = useRef<THREE.InstancedMesh>(null);
  const n = scene.ids.length;
  const ringed = useMemo(() => scene.nodes.map((m, i) => (m.ring || i === selected ? i : -1)).filter((i) => i >= 0), [scene, selected]);
  const pulsing = useMemo(() => scene.nodes.map((m, i) => (m.pulse ? i : -1)).filter((i) => i >= 0), [scene]);

  useLayoutEffect(() => {
    const m = mesh.current;
    if (!m) return;
    const tmp = new THREE.Object3D();
    const color = new THREE.Color();
    for (let i = 0; i < n; i++) {
      tmp.position.fromArray(scene.positions, i * 3);
      tmp.scale.setScalar(scene.sizes[i] * (i === selected ? 1.12 : 1));
      tmp.updateMatrix();
      m.setMatrixAt(i, tmp.matrix);
      const faded = focus && !focus.nodes.has(i);
      color.setRGB(...(faded ? mix(scene.colors, 0.28, i * 3) : mix(scene.colors, 1, i * 3)));
      m.setColorAt(i, color);
    }
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
    m.computeBoundingSphere();
  }, [scene, focus, selected, n]);

  useLayoutEffect(() => {
    const h = halo.current;
    if (!h) return;
    const tmp = new THREE.Object3D();
    const color = new THREE.Color();
    ringed.forEach((i, k) => {
      tmp.position.fromArray(scene.positions, i * 3);
      tmp.scale.setScalar(scene.sizes[i] * 1.45);
      tmp.updateMatrix();
      h.setMatrixAt(k, tmp.matrix);
      color.set(i === selected ? SELECTED : (scene.nodes[i].ring ?? SELECTED));
      h.setColorAt(k, color);
    });
    h.count = ringed.length;
    h.instanceMatrix.needsUpdate = true;
    if (h.instanceColor) h.instanceColor.needsUpdate = true;
  }, [scene, ringed, selected]);

  // Hanging elements breathe.
  useFrame(({ clock }) => {
    const m = mesh.current;
    if (!m || pulsing.length === 0) return;
    const tmp = new THREE.Object3D();
    const s = 1 + 0.18 * Math.sin(clock.elapsedTime * 5);
    for (const i of pulsing) {
      tmp.position.fromArray(scene.positions, i * 3);
      tmp.scale.setScalar(scene.sizes[i] * s);
      tmp.updateMatrix();
      m.setMatrixAt(i, tmp.matrix);
    }
    m.instanceMatrix.needsUpdate = true;
  });

  const idOf = (e: ThreeEvent<PointerEvent | MouseEvent>) => (e.instanceId !== undefined ? scene.ids[e.instanceId] : null);
  return (
    <group>
      <instancedMesh
        key={`nodes-${n}`}
        ref={mesh}
        args={[undefined, undefined, Math.max(1, n)]}
        onPointerMove={(e) => {
          e.stopPropagation();
          onNode('nodeHover', idOf(e), e.nativeEvent);
        }}
        onPointerOut={(e) => onNode('nodeHover', null, e.nativeEvent)}
        onClick={(e) => {
          e.stopPropagation();
          if (e.delta <= 4) onNode('nodeClick', idOf(e), e.nativeEvent);
        }}
        onDoubleClick={(e) => {
          e.stopPropagation();
          onNode('nodeDoubleClick', idOf(e), e.nativeEvent);
        }}
        onContextMenu={(e) => {
          e.stopPropagation();
          e.nativeEvent.preventDefault();
          onNode('nodeContext', idOf(e), e.nativeEvent);
        }}
      >
        <sphereGeometry args={[1, 32, 20]} />
        <meshStandardMaterial roughness={0.42} metalness={0.08} />
      </instancedMesh>
      <instancedMesh key={`halo-${n}`} ref={halo} args={[undefined, undefined, Math.max(1, n)]} raycast={() => null}>
        <sphereGeometry args={[1, 24, 16]} />
        <meshBasicMaterial transparent opacity={0.28} depthWrite={false} side={THREE.BackSide} toneMapped={false} />
      </instancedMesh>
    </group>
  );
}

function Edges({ scene, focus }: { scene: SceneData; focus: Focus }) {
  const tubes = useRef<THREE.InstancedMesh>(null);
  const heads = useRef<THREE.InstancedMesh>(null);
  const m = scene.edges.length;

  useLayoutEffect(() => {
    const t = tubes.current;
    const h = heads.current;
    if (!t || !h) return;
    const tmp = new THREE.Object3D();
    const color = new THREE.Color();
    const a = new THREE.Vector3();
    const b = new THREE.Vector3();
    const dir = new THREE.Vector3();
    scene.edges.forEach((e, k) => {
      a.fromArray(scene.segments, k * 6);
      b.fromArray(scene.segments, k * 6 + 3);
      dir.subVectors(b, a);
      const len = dir.length();
      dir.normalize();
      const focused = focus?.edges.has(k) ?? false;
      const w = (0.16 + 0.07 * Math.sqrt(e.width)) * (focused ? 1.7 : 1);
      const head = 1.6 + w * 3.2;
      const rs = scene.sizes[e.source];
      const rt = scene.sizes[e.target];
      const bodyLen = len - rs - rt - head;
      if (bodyLen <= 0.2) {
        tmp.scale.setScalar(0);
        tmp.updateMatrix();
        t.setMatrixAt(k, tmp.matrix);
        h.setMatrixAt(k, tmp.matrix);
      } else {
        tmp.quaternion.setFromUnitVectors(UP, dir);
        tmp.position.copy(a).addScaledVector(dir, rs + bodyLen / 2);
        tmp.scale.set(w, bodyLen, w);
        tmp.updateMatrix();
        t.setMatrixAt(k, tmp.matrix);
        tmp.position.copy(b).addScaledVector(dir, -(rt + head / 2));
        tmp.scale.set(head * 0.42, head, head * 0.42);
        tmp.updateMatrix();
        h.setMatrixAt(k, tmp.matrix);
      }
      const k3 = k * 3;
      color.setRGB(...(focus && !focused ? mix(scene.edgeColors, 0.22, k3) : mix(scene.edgeColors, focused ? 1 : 0.85, k3)));
      if (focused) color.multiplyScalar(1.35);
      t.setColorAt(k, color);
      h.setColorAt(k, color);
    });
    for (const x of [t, h]) {
      x.instanceMatrix.needsUpdate = true;
      if (x.instanceColor) x.instanceColor.needsUpdate = true;
    }
  }, [scene, focus]);

  if (m === 0) return null;
  return (
    <group>
      <instancedMesh key={`tubes-${m}`} ref={tubes} args={[undefined, undefined, m]} raycast={() => null}>
        <cylinderGeometry args={[1, 1, 1, 8, 1, true]} />
        <meshBasicMaterial toneMapped={false} />
      </instancedMesh>
      <instancedMesh key={`heads-${m}`} ref={heads} args={[undefined, undefined, m]} raycast={() => null}>
        <coneGeometry args={[1, 1, 14]} />
        <meshBasicMaterial toneMapped={false} />
      </instancedMesh>
    </group>
  );
}

// Live runtime flows: small dots travelling along animated edges.
function Particles({ scene }: { scene: SceneData }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const animated = useMemo(() => scene.edges.map((e, k) => (e.animated ? k : -1)).filter((k) => k >= 0), [scene]);
  const per = 3;
  useFrame(({ clock }) => {
    const p = ref.current;
    if (!p) return;
    const tmp = new THREE.Object3D();
    const a = new THREE.Vector3();
    const b = new THREE.Vector3();
    animated.forEach((k, j) => {
      a.fromArray(scene.segments, k * 6);
      b.fromArray(scene.segments, k * 6 + 3);
      for (let q = 0; q < per; q++) {
        const f = (clock.elapsedTime * 0.45 + q / per) % 1;
        tmp.position.lerpVectors(a, b, f);
        tmp.scale.setScalar(0.7);
        tmp.updateMatrix();
        p.setMatrixAt(j * per + q, tmp.matrix);
      }
    });
    p.instanceMatrix.needsUpdate = true;
  });
  if (animated.length === 0) return null;
  return (
    <instancedMesh key={`particles-${animated.length}`} ref={ref} args={[undefined, undefined, animated.length * per]} raycast={() => null}>
      <sphereGeometry args={[1, 10, 8]} />
      <meshBasicMaterial color="#fde68a" toneMapped={false} />
    </instancedMesh>
  );
}

interface Glide {
  from: { pos: THREE.Vector3; target: THREE.Vector3 };
  to: { pos: THREE.Vector3; target: THREE.Vector3 };
  start: number;
  ms: number;
}

// Frames the level on a new graph / fit request, glides to the selected node, keeps the bridge current.
function CameraRig({ state, bridge, onFitted }: Pick<GraphSceneProps, 'state' | 'bridge' | 'onFitted'>) {
  const { camera, size, controls, scene: threeScene } = useThree();
  const glide = useRef<Glide | null>(null);
  const cam = camera as THREE.PerspectiveCamera;
  const orbit = controls as unknown as (SceneBridge['controls'] & { minDistance: number; maxDistance: number }) | null;

  useEffect(() => {
    bridge.current.camera = cam;
    bridge.current.controls = orbit;
    bridge.current.size = { width: size.width, height: size.height };
  }, [bridge, cam, orbit, size.width, size.height]);

  const startGlide = (pos: THREE.Vector3, target: THREE.Vector3, ms: number) => {
    if (!orbit) return;
    glide.current = { from: { pos: cam.position.clone(), target: orbit.target.clone() }, to: { pos, target }, start: performance.now(), ms };
  };

  // Frame the whole level. The user's own camera moves (drag, wheel) stop resizes from re-framing, like the 2D view.
  const userMoved = useRef(false);
  const frame = (ms: number) => {
    const s = state.scene;
    if (!s || !orbit) return;
    const d = frameDistance(s, VIEW_DIR_ARRAY, cam.fov, size.width / Math.max(1, size.height));
    const center = new THREE.Vector3(...s.center);
    orbit.minDistance = 4;
    orbit.maxDistance = d * 3;
    cam.near = Math.max(0.1, d / 400);
    cam.far = d * 8;
    cam.updateProjectionMatrix();
    threeScene.fog = new THREE.Fog(BACKGROUND, d * 0.8, d + s.radius * 3);
    bridge.current.fitDistance = d;
    startGlide(center.clone().addScaledVector(VIEW_DIR, d), center, ms);
    onFitted(d);
  };

  useEffect(() => {
    const o = orbit as unknown as THREE.EventDispatcher<{ start: object }> | null;
    if (!o?.addEventListener) return;
    const onStart = () => (userMoved.current = true);
    o.addEventListener('start', onStart);
    return () => o.removeEventListener('start', onStart);
  }, [orbit]);

  useEffect(() => {
    if (state.fitRequest === 0) return;
    userMoved.current = false;
    frame(420);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only a new fit request frames the view
  }, [state.fitRequest, orbit]);

  useEffect(() => {
    if (state.fitRequest > 0 && !userMoved.current) frame(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- re-frame when the map area changes size
  }, [size.width, size.height]);

  useEffect(() => {
    const s = state.scene;
    if (!s || !orbit || state.focusRequest === 0 || !state.selected) return;
    const i = s.ids.indexOf(state.selected);
    if (i < 0) return;
    const target = new THREE.Vector3().fromArray(s.positions, i * 3);
    const offset = cam.position.clone().sub(orbit.target);
    startGlide(target.clone().add(offset), target, 380);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- glide once per select()
  }, [state.focusRequest, orbit]);

  useFrame(() => {
    const g = glide.current;
    if (!g || !orbit) return;
    const t = g.ms <= 0 ? 1 : Math.min(1, (performance.now() - g.start) / g.ms);
    const e = 1 - (1 - t) ** 3;
    cam.position.lerpVectors(g.from.pos, g.to.pos, e);
    orbit.target.lerpVectors(g.from.target, g.to.target, e);
    orbit.update();
    if (t >= 1) glide.current = null;
  });
  return null;
}

// Name chips above the nodes, projected every frame (crisp HTML text, constant size, fading with distance).
function LabelProjector({ scene, indices, refs }: { scene: SceneData; indices: number[]; refs: MutableRefObject<Map<number, HTMLDivElement>> }) {
  const { camera, size } = useThree();
  const v = useMemo(() => new THREE.Vector3(), []);
  useFrame(() => {
    const cam = camera as THREE.PerspectiveCamera;
    const far = cam.far || 1;
    for (const i of indices) {
      const el = refs.current.get(i);
      if (!el) continue;
      v.fromArray(scene.positions, i * 3);
      const dist = v.distanceTo(cam.position);
      v.project(cam);
      if (v.z > 1 || v.z < -1) {
        el.style.opacity = '0';
        continue;
      }
      // Where the node's centre is on screen (read by real-app checks), then the label just above the sphere.
      el.dataset.cx = String(Math.round(((v.x + 1) / 2) * size.width));
      el.dataset.cy = String(Math.round(((1 - v.y) / 2) * size.height));
      v.fromArray(scene.positions, i * 3);
      v.y += scene.sizes[i] * 1.15;
      v.project(cam);
      const x = ((v.x + 1) / 2) * size.width;
      const y = ((1 - v.y) / 2) * size.height;
      el.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) translate(-50%, -100%)`;
      el.style.opacity = String(Math.max(0.35, Math.min(1, 1.25 - (dist / far) * 4)));
    }
  });
  return null;
}

export function GraphScene({ state, bridge, onNode, onBackground, onFitted }: GraphSceneProps) {
  const { scene } = state;
  const focus = useFocus(scene, state.hovered, state.selected);
  const selected = scene && state.selected ? scene.ids.indexOf(state.selected) : -1;
  const labelRefs = useRef(new Map<number, HTMLDivElement>());
  const labels = useMemo(() => (scene ? labelIndices(scene, new Set([...(focus?.nodes ?? []), ...(selected >= 0 ? [selected] : [])])) : []), [scene, focus, selected]);

  return (
    <div className="pv-r3f-view" style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden', background: BACKGROUND }}>
      <Canvas
        camera={{ fov: 50, position: [0, 0, 300], near: 0.5, far: 5000 }}
        dpr={[1, 2]}
        gl={{ antialias: true }}
        onPointerMissed={(e) => onBackground(e)}
        style={{ position: 'absolute', inset: 0 }}
      >
        <color attach="background" args={[BACKGROUND]} />
        <ambientLight intensity={0.6} />
        <hemisphereLight args={['#c7d7ff', '#1b1f2e', 0.45]} />
        <directionalLight position={[80, 160, 120]} intensity={1.15} />
        <OrbitControls makeDefault enableDamping dampingFactor={0.12} zoomToCursor rotateSpeed={0.6} zoomSpeed={0.9} />
        <CameraRig state={state} bridge={bridge} onFitted={onFitted} />
        {scene && (
          <>
            <Edges scene={scene} focus={focus} />
            <Nodes scene={scene} focus={focus} selected={selected} onNode={onNode} />
            <Particles scene={scene} />
            <LabelProjector scene={scene} indices={labels} refs={labelRefs} />
          </>
        )}
      </Canvas>
      <div className="pv-r3f-labels" aria-hidden="true" style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
        {scene &&
          labels.map((i) => {
            const meta = scene.nodes[i];
            const strong = i === selected || i === focus?.index;
            return (
              <div
                key={meta.id}
                ref={(el) => {
                  if (el) labelRefs.current.set(i, el);
                  else labelRefs.current.delete(i);
                }}
                className="pv-r3f-label"
                data-id={meta.id}
                style={{
                  position: 'absolute',
                  left: 0,
                  top: 0,
                  opacity: 0,
                  padding: '1px 6px',
                  borderRadius: 4,
                  font: `${strong ? 600 : 500} 11px/1.4 system-ui, sans-serif`,
                  color: strong ? '#ffffff' : '#dbe4f3',
                  background: strong ? 'rgba(30, 41, 59, 0.92)' : 'rgba(15, 23, 42, 0.62)',
                  border: `1px solid ${strong ? SELECTED : 'rgba(148, 163, 184, 0.25)'}`,
                  whiteSpace: 'nowrap',
                  willChange: 'transform',
                }}
              >
                {meta.label}
                {meta.badge && (
                  <span className="pv-r3f-badge" style={{ marginLeft: 5, padding: '0 4px', borderRadius: 3, background: '#b91c1c', color: '#fff', fontSize: 10 }}>
                    {meta.badge}
                  </span>
                )}
              </div>
            );
          })}
      </div>
      <div
        className="pv-r3f-legend"
        style={{ position: 'absolute', left: 10, bottom: 8, display: 'flex', flexWrap: 'wrap', gap: '4px 12px', font: '11px system-ui, sans-serif', color: '#94a3b8', pointerEvents: 'none', maxWidth: 'calc(100% - 20px)' }}
      >
        {EDGE_LEGEND.map(([name, c]) => (
          <span key={name} style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
            <span style={{ width: 16, height: 3, borderRadius: 2, background: c, display: 'inline-block' }} />
            {name}
          </span>
        ))}
        <span>drag to turn · right-drag to move · scroll into an element to open it</span>
      </div>
      {state.hint && (
        <div
          className="pv-r3f-zoom-hint"
          role="status"
          style={{ position: 'fixed', left: state.hint.x + 14, top: state.hint.y + 14, padding: '3px 8px', borderRadius: 4, background: '#1e293b', color: '#f8fafc', font: '12px system-ui, sans-serif', pointerEvents: 'none', zIndex: 10 }}
        >
          {state.hint.text}
        </div>
      )}
    </div>
  );
}
