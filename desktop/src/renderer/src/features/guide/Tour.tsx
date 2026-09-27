import { useEffect, useState } from 'react';
import { Button } from '../../ui/Button';
import { useTourStore } from './tour-store';

interface Box {
  top: number;
  left: number;
  width: number;
  height: number;
}

const BUBBLE_W = 320;
const GAP = 12;

// Where the bubble goes: beside the highlighted area if there is room, else below or above it; always on screen.
export function placeBubble(target: Box, view: { width: number; height: number }, bubbleH = 170): { top: number; left: number } {
  const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
  const maxLeft = view.width - BUBBLE_W - 8;
  const maxTop = view.height - bubbleH - 8;
  if (target.left + target.width + GAP + BUBBLE_W <= view.width - 8) {
    return { left: target.left + target.width + GAP, top: clamp(target.top, 8, maxTop) };
  }
  if (target.left - GAP - BUBBLE_W >= 8) return { left: target.left - GAP - BUBBLE_W, top: clamp(target.top, 8, maxTop) };
  if (target.top + target.height + GAP + bubbleH <= view.height - 8) {
    return { left: clamp(target.left, 8, maxLeft), top: target.top + target.height + GAP };
  }
  // big target (e.g. the whole map): inside it, near the bottom-left corner (the top holds the dashboard card)
  return { left: clamp(target.left + 16, 8, maxLeft), top: clamp(target.top + target.height - bubbleH - 16, 8, maxTop) };
}

// A highlight ring around one part of the screen and a bubble explaining it; the rest is dimmed.
export function Tour() {
  const { steps, index, next, back, stop } = useTourStore();
  const step = steps[index];
  const [box, setBox] = useState<Box | null>(null);
  const [view, setView] = useState({ width: window.innerWidth, height: window.innerHeight });

  useEffect(() => {
    if (!step) return;
    const measure = () => {
      const el = document.querySelector(step.target);
      const r = el?.getBoundingClientRect();
      setBox(r && r.width > 0 ? { top: r.top, left: r.left, width: r.width, height: r.height } : null);
      setView({ width: window.innerWidth, height: window.innerHeight });
    };
    measure();
    const timer = setInterval(measure, 300); // follows resizes and panels that open late
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') stop();
      else if (e.key === 'ArrowRight' || e.key === 'Enter') next();
      else if (e.key === 'ArrowLeft') back();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      clearInterval(timer);
      window.removeEventListener('keydown', onKey);
    };
  }, [step, next, back, stop]);

  if (!step) return null;
  const target = box ?? { top: view.height / 2 - 1, left: view.width / 2 - 1, width: 2, height: 2 };
  const pos = placeBubble(target, view);
  const last = index === steps.length - 1;
  return (
    <div className="pv-tour" style={{ position: 'fixed', inset: 0, zIndex: 1000 }}>
      {/* The tour explains the screen itself: the dashboard card steps aside meanwhile. */}
      <style>{'.pv-intro-card, .pv-intro-reopen { visibility: hidden; }'}</style>
      <div
        aria-hidden="true"
        className="pv-tour-ring"
        style={{ position: 'fixed', top: target.top - 4, left: target.left - 4, width: target.width + 8, height: target.height + 8, borderRadius: 10, border: '2px solid var(--accent)', boxShadow: '0 0 0 9999px rgba(15, 23, 42, 0.55)', pointerEvents: 'none', transition: 'all 0.2s' }}
      />
      <div
        role="dialog"
        aria-label={step.title}
        aria-describedby="pv-tour-text"
        style={{ position: 'fixed', top: pos.top, left: pos.left, width: BUBBLE_W, maxWidth: 'calc(100vw - 16px)', padding: '12px 14px', borderRadius: 10, background: 'var(--bg-panel)', color: 'var(--fg)', border: '1px solid var(--border)', boxShadow: '0 10px 30px rgba(0,0,0,0.3)', display: 'grid', gap: 8 }}
      >
        <strong>{step.title}</strong>
        <p id="pv-tour-text" style={{ margin: 0, lineHeight: 1.5 }}>
          {step.text}
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {steps.length > 1 && (
            <span style={{ color: 'var(--fg-muted)', fontSize: 12 }}>
              {index + 1} of {steps.length}
            </span>
          )}
          <span style={{ flex: 1 }} />
          {!last && (
            <Button size="sm" variant="ghost" onClick={stop}>
              Skip
            </Button>
          )}
          {index > 0 && (
            <Button size="sm" onClick={back}>
              Back
            </Button>
          )}
          <Button size="sm" variant="primary" onClick={next}>
            {last ? (steps.length > 1 ? 'Finish' : 'Got it') : 'Next'}
          </Button>
        </div>
      </div>
    </div>
  );
}
