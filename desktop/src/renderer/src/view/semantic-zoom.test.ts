import { describe, expect, it } from 'vitest';
import { SemanticZoom, type ZoomHint, type ZoomTarget } from './semantic-zoom';

const IN = { deltaY: -100, clientX: 10, clientY: 20 };
const OUT = { deltaY: 100, clientX: 10, clientY: 20 };
const pkg: ZoomTarget = { id: 'package:app', label: 'app', canOpen: true, fillsView: false };

function setup() {
  const events: Array<[string, string | null]> = [];
  const hints: Array<ZoomHint | null> = [];
  const z = new SemanticZoom((e, id) => events.push([e, id]), (h) => hints.push(h));
  z.fitted(1, 0); // cool-down until 900
  return { z, events, hints };
}

describe('SemanticZoom', () => {
  it('opens the element under the pointer after a few steps past the drill zoom', () => {
    const { z, events, hints } = setup();
    z.wheel(IN, 2.2, pkg, 1000);
    z.wheel(IN, 2.4, pkg, 1100);
    expect(events).toEqual([]);
    expect(hints.at(-1)?.text).toBe('Keep zooming to open app');
    z.wheel(IN, 2.6, pkg, 1200);
    expect(events).toEqual([['zoomIn', 'package:app']]);
  });

  it('does nothing while still zoomed out, over leaves, or during the cool-down', () => {
    const { z, events } = setup();
    for (let t = 1000; t < 1400; t += 100) z.wheel(IN, 1.2, pkg, t); // not big enough yet (fit 1 × 1.25)
    for (let t = 1400; t < 1800; t += 100) z.wheel(IN, 2.5, { ...pkg, canOpen: false }, t);
    z.fitted(1, 2000);
    for (let t = 2000; t < 2800; t += 100) z.wheel(IN, 2.5, pkg, t); // cool-down until 2900
    expect(events).toEqual([]);
  });

  it('a big element opens even below the drill zoom', () => {
    const { z, events } = setup();
    for (let t = 1000; t < 1300; t += 100) z.wheel(IN, 1.1, { ...pkg, fillsView: true }, t);
    expect(events).toEqual([['zoomIn', 'package:app']]);
  });

  it('goes up after zooming out well past the whole level', () => {
    const { z, events, hints } = setup();
    z.wheel(OUT, 0.8, null, 1000); // still near the fitted zoom
    z.wheel(OUT, 0.55, null, 1100);
    z.wheel(OUT, 0.5, null, 1200);
    expect(hints.at(-1)?.text).toBe('Keep zooming out to go up a level');
    z.wheel(OUT, 0.45, null, 1300);
    expect(events).toEqual([['zoomOut', null]]);
  });

  it('pauses between steps start over and changing target restarts the count', () => {
    const { z, events } = setup();
    z.wheel(IN, 2.5, pkg, 1000);
    z.wheel(IN, 2.5, pkg, 1100);
    z.wheel(IN, 2.5, pkg, 3000); // too late: starts over
    z.wheel(IN, 2.5, { ...pkg, id: 'package:other' }, 3100);
    z.wheel(IN, 2.5, pkg, 3200);
    expect(events).toEqual([]);
  });

  it('counts "big" from the fitted zoom when that comes before the drill zoom', () => {
    const events: Array<[string, string | null]> = [];
    const z = new SemanticZoom((e, id) => events.push([e, id]));
    z.fitted(1.5, 0);
    for (let t = 1000; t < 1300; t += 100) z.wheel(IN, 1.9, pkg, t); // 1.5 × 1.25 = 1.875
    expect(events).toEqual([['zoomIn', 'package:app']]);
  });
});
