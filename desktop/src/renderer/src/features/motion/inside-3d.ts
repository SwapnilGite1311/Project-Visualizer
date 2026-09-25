// The running function in 3D: statements are platforms along a path, the call stack is a pile of floors,
// and a glowing runner moves to the statement being executed. three.js is loaded only when the view mounts.
import type * as THREE from 'three';
import type { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import type { Platform } from './scene';

export interface FloorScene {
  nodeId: string;
  level: number;
  activeBlockId: string | null;
  platforms: Platform[];
  title: string;
}

const FLOOR_HEIGHT = 4;
const STEP_DEPTH = 1.5;

type Three = typeof THREE;

function textSprite(three: Three, text: string, color: string, scale = 1): THREE.Sprite {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.font = '28px Consolas, monospace';
    ctx.fillStyle = color;
    ctx.fillText(text.length > 34 ? text.slice(0, 33) + '…' : text, 8, 42);
  }
  const texture = new three.CanvasTexture(canvas);
  const sprite = new three.Sprite(new three.SpriteMaterial({ map: texture, transparent: true, depthWrite: false }));
  sprite.scale.set(8 * scale, 1 * scale, 1);
  return sprite;
}

export class InsideScene3D {
  private three: Three | null = null;
  private renderer: THREE.WebGLRenderer | null = null;
  private scene: THREE.Scene | null = null;
  private camera: THREE.PerspectiveCamera | null = null;
  private controls: OrbitControls | null = null;
  private floorsGroup: THREE.Group | null = null;
  private runner: THREE.Mesh | null = null;
  private target: THREE.Vector3 | null = null;
  private pending: FloorScene[] | null = null;
  private frame = 0;
  private destroyed = false;
  private resizeObserver: ResizeObserver | null = null;
  private container: HTMLElement | null = null;

  mount(container: HTMLElement): void {
    this.container = container;
    void Promise.all([import('three'), import('three/examples/jsm/controls/OrbitControls.js')]).then(([three, controls]) => {
      if (this.destroyed) return;
      this.create(three, controls.OrbitControls, container);
    });
  }

  setFloors(floors: FloorScene[]): void {
    if (!this.three) {
      this.pending = floors;
      return;
    }
    this.buildFloors(floors);
  }

  destroy(): void {
    this.destroyed = true;
    cancelAnimationFrame(this.frame);
    this.resizeObserver?.disconnect();
    this.controls?.dispose();
    if (this.floorsGroup) this.disposeGroup(this.floorsGroup);
    if (this.runner) {
      this.runner.geometry.dispose();
      (this.runner.material as THREE.Material).dispose();
    }
    this.renderer?.dispose();
    if (this.container) this.container.innerHTML = '';
    this.renderer = null;
    this.scene = null;
  }

  private create(three: Three, Controls: typeof OrbitControls, container: HTMLElement): void {
    this.three = three;
    const width = container.clientWidth || 800;
    const height = container.clientHeight || 500;
    const renderer = new three.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(width, height);
    container.appendChild(renderer.domElement);
    const scene = new three.Scene();
    scene.background = new three.Color('#0f1320');
    scene.add(new three.AmbientLight(0xffffff, 0.7));
    const light = new three.DirectionalLight(0xffffff, 0.9);
    light.position.set(5, 12, 8);
    scene.add(light);
    const camera = new three.PerspectiveCamera(50, width / height, 0.1, 500);
    camera.position.set(10, 8, 10);
    const controls = new Controls(camera, renderer.domElement);
    controls.enableDamping = true;
    const runner = new three.Mesh(
      new three.SphereGeometry(0.3, 24, 16),
      new three.MeshStandardMaterial({ color: '#fbbf24', emissive: '#fbbf24', emissiveIntensity: 0.9 }),
    );
    scene.add(runner);
    Object.assign(this, { renderer, scene, camera, controls, runner, target: new three.Vector3() });
    if (typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(() => {
        const w = container.clientWidth;
        const h = container.clientHeight;
        if (!w || !h) return;
        renderer.setSize(w, h);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
      });
      this.resizeObserver.observe(container);
    }
    if (this.pending) this.buildFloors(this.pending);
    this.pending = null;
    const tick = () => {
      if (this.destroyed || !this.runner || !this.target) return;
      this.runner.position.lerp(this.target, 0.2);
      controls.target.lerp(this.runner.position, 0.08);
      controls.update();
      renderer.render(scene, camera);
      this.frame = requestAnimationFrame(tick);
    };
    tick();
  }

  private buildFloors(floors: FloorScene[]): void {
    const three = this.three;
    if (!three || !this.scene) return;
    if (this.floorsGroup) {
      this.scene.remove(this.floorsGroup);
      this.disposeGroup(this.floorsGroup);
    }
    const group = new three.Group();
    const topLevel = floors.length ? floors[floors.length - 1].level : 0;
    for (const floor of floors) {
      const isTop = floor.level === topLevel;
      const y = floor.level * FLOOR_HEIGHT;
      const title = textSprite(three, floor.title, isTop ? '#fbbf24' : '#94a3b8', 1.2);
      title.position.set(6, y + 1.6, 1.5);
      group.add(title);
      for (const p of floor.platforms) {
        const active = isTop && p.blockId === floor.activeBlockId;
        const box = new three.Mesh(
          new three.BoxGeometry(p.width / 20, 0.25, 1.1),
          new three.MeshStandardMaterial({
            color: p.color,
            transparent: true,
            opacity: isTop ? (active ? 1 : 0.8) : 0.35,
            emissive: active ? '#fbbf24' : '#000000',
            emissiveIntensity: active ? 0.4 : 0,
          }),
        );
        const x = p.x / 20 + p.width / 40;
        const z = -p.index * STEP_DEPTH;
        box.position.set(x, y, z);
        group.add(box);
        if (isTop) {
          const label = textSprite(three, `${p.line}  ${p.text}`, '#e2e8f0', 0.6);
          label.position.set(x, y + 0.55, z);
          group.add(label);
        }
        if (active && this.target) this.target.set(p.x / 20 - 0.6, y + 0.45, z);
      }
    }
    this.scene.add(group);
    this.floorsGroup = group;
  }

  private disposeGroup(group: THREE.Group): void {
    group.traverse((obj) => {
      const mesh = obj as THREE.Mesh | THREE.Sprite;
      if ('geometry' in mesh && mesh.geometry) mesh.geometry.dispose();
      const material = (mesh as THREE.Mesh).material as THREE.Material | undefined;
      if (material) {
        const map = (material as THREE.SpriteMaterial).map;
        map?.dispose();
        material.dispose();
      }
    });
  }
}
