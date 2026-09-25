import { useEffect, useRef } from 'react';
import { type FloorScene, InsideScene3D } from './inside-3d';

export function InsideView3D({ floors }: { floors: FloorScene[] }) {
  const container = useRef<HTMLDivElement>(null);
  const scene = useRef<InsideScene3D | null>(null);

  useEffect(() => {
    if (!container.current) return;
    const s = new InsideScene3D();
    s.mount(container.current);
    scene.current = s;
    return () => {
      s.destroy();
      scene.current = null;
    };
  }, []);

  useEffect(() => {
    scene.current?.setFloors(floors);
  }, [floors]);

  return <div ref={container} data-testid="inside-3d" style={{ width: '100%', height: '100%', minHeight: 300 }} />;
}
