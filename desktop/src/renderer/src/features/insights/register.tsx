import type { AppRegistry } from '../../core/registry';
import { InsightsPanel } from './InsightsPanel';

export default function register(app: AppRegistry): void {
  app.addPanel({ id: 'insights', title: 'Insights', area: 'left', order: 20, component: InsightsPanel });
}
