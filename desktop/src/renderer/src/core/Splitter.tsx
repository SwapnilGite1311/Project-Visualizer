import type { KeyboardEvent, PointerEvent } from 'react';
import styles from './Layout.module.css';
import { type SizedArea, usePanelSizes } from './panel-sizes';

const STEP = 16;
const LABELS: Record<SizedArea, string> = {
  left: 'Resize left panel',
  right: 'Resize right panel',
  bottom: 'Resize bottom panel',
};

// A drag handle on the inner edge of a panel area. Drag or use the arrow keys; double-click puts the panel back to its automatic size.
export function Splitter({ area }: { area: SizedArea }) {
  const size = usePanelSizes((s) => s.sizes[area]);

  const currentSize = (el: HTMLElement) => {
    const r = (el.parentElement as HTMLElement).getBoundingClientRect();
    return area === 'bottom' ? r.height : r.width;
  };

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    e.preventDefault();
    const handle = e.currentTarget;
    const start = area === 'bottom' ? e.clientY : e.clientX;
    const startSize = currentSize(handle);
    handle.setPointerCapture?.(e.pointerId);
    const move = (ev: globalThis.PointerEvent) => {
      const pos = area === 'bottom' ? ev.clientY : ev.clientX;
      const delta = area === 'left' ? pos - start : start - pos; // right and bottom grow towards the start
      usePanelSizes.getState().setSize(area, startSize + delta);
    };
    const up = () => {
      handle.removeEventListener('pointermove', move);
      handle.removeEventListener('pointerup', up);
      handle.removeEventListener('pointercancel', up);
    };
    handle.addEventListener('pointermove', move);
    handle.addEventListener('pointerup', up);
    handle.addEventListener('pointercancel', up);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const grow = { left: 'ArrowRight', right: 'ArrowLeft', bottom: 'ArrowUp' }[area];
    const shrink = { left: 'ArrowLeft', right: 'ArrowRight', bottom: 'ArrowDown' }[area];
    if (e.key !== grow && e.key !== shrink) return;
    e.preventDefault();
    const now = size ?? currentSize(e.currentTarget);
    usePanelSizes.getState().setSize(area, now + (e.key === grow ? STEP : -STEP));
  };

  return (
    <div
      role="separator"
      aria-label={LABELS[area]}
      aria-orientation={area === 'bottom' ? 'horizontal' : 'vertical'}
      tabIndex={0}
      title="Drag to resize · double-click to reset"
      className={`${styles.splitter} ${styles[`splitter-${area}`]}`}
      onPointerDown={onPointerDown}
      onKeyDown={onKeyDown}
      onDoubleClick={() => usePanelSizes.getState().reset(area)}
    />
  );
}
