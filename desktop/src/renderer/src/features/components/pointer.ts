import { create } from 'zustand';

export const usePointer = create<{ x: number; y: number }>()(() => ({ x: 0, y: 0 }));

// One window-level listener keeps the last mouse position (the renderers' hover events carry no position).
export function installPointerTracking(): () => void {
  const onMove = (e: MouseEvent) => usePointer.setState({ x: e.clientX, y: e.clientY });
  window.addEventListener('mousemove', onMove);
  return () => window.removeEventListener('mousemove', onMove);
}
