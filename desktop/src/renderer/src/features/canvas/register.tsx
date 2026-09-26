import type { AppRegistry } from '../../core/registry';
import { Canvas } from '../../view/Canvas';
import { canvasBus } from '../../view/canvas-bus';
import { GraphViewSettings } from './GraphViewSettings';

function CanvasPanel() {
  return <Canvas />;
}

export default function register(app: AppRegistry): void {
  app.addPanel({ id: 'canvas', title: 'Map', area: 'center', order: 0, component: CanvasPanel });
  app.addCommand({ id: 'canvas.fit', title: 'Fit map to screen', shortcut: 'Ctrl+0', run: () => canvasBus.fit() });
  app.addSettingsSection({ id: 'graph-view', title: 'Graph view', order: 15, component: GraphViewSettings });
}
