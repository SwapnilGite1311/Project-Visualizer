import { describe, expect, it } from 'vitest';
import { buildMotionOverlay } from './map-motion';

const level = new Set(['package:app', 'module:main.py', 'external:sys']);
const edges = [
  { id: 'e1', source: 'module:main.py', target: 'package:app' },
  { id: 'e2', source: 'module:main.py', target: 'external:sys' },
];
const main = { nodeId: 'function:main.py#main', ancestors: ['project:', 'module:main.py', 'function:main.py#main'] };
const getUser = {
  nodeId: 'method:app/services.py#UserService.get_user',
  ancestors: ['project:', 'package:app', 'module:app/services.py', 'class:app/services.py#UserService', 'method:app/services.py#UserService.get_user'],
};

describe('buildMotionOverlay', () => {
  it('lights the level element that contains the running function', () => {
    const { overlay, visible } = buildMotionOverlay(level, edges, [main, getUser], null);
    expect(visible).toBe('package:app');
    expect(overlay.priority).toBe(50);
    expect(overlay.nodes['package:app']).toEqual({ pulse: true, color: '#fbbf24', borderColor: '#fbbf24', badge: '▶' });
    expect(overlay.nodes['module:main.py']).toEqual({ color: '#38bdf8' });
    expect(overlay.edges).toEqual({});
  });

  it('animates the edge travelled since the previous step', () => {
    const { overlay } = buildMotionOverlay(level, edges, [main, getUser], 'module:main.py');
    expect(overlay.edges).toEqual({ e1: { animated: true, color: '#fbbf24', width: 4 } });
    const back = buildMotionOverlay(level, edges, [main], 'package:app');
    expect(back.overlay.edges).toEqual({ e1: { animated: true, color: '#fbbf24', width: 4 } });
  });

  it('shows nothing when no frame is on this level', () => {
    const { overlay, visible } = buildMotionOverlay(new Set(['package:other']), [], [main], null);
    expect(visible).toBeNull();
    expect(overlay.nodes).toEqual({});
  });
});
