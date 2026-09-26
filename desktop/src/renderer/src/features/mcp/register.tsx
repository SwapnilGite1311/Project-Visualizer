import type { AppRegistry } from '../../core/registry';
import { McpSettings } from './McpSettings';

export default function register(app: AppRegistry): void {
  app.addSettingsSection({
    id: 'mcp',
    title: 'AI coding agents',
    order: 40,
    component: McpSettings,
  });
}
