// @vitest-environment jsdom
import { configure, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { type FakeBridge, installFakeBridge } from '../../api/fake-bridge';
import { createRegistry } from '../../core/registry';
import { useAppStore } from '../../core/store';
import { claudeCodeCommand, McpSettings, mcpJsonConfig } from './McpSettings';
import register from './register';

configure({ asyncUtilTimeout: 5000 });

const writeText = vi.fn<(text: string) => Promise<void>>(async () => undefined);
let fake: FakeBridge;
beforeEach(() => {
  writeText.mockClear();
  Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
  fake = installFakeBridge();
  fake.invokeHandlers.set('pv:app.info', () => ({
    version: '0.1.0',
    platform: 'win32',
    engineStatus: 'ready',
    enginePath: 'C:\\Program Files\\Project Visualizer\\pv-engine.exe',
  }));
  useAppStore.setState({ projectRoot: 'C:\\code\\shop' });
});

describe('MCP settings', () => {
  it('registers the settings section', () => {
    const r = createRegistry();
    register(r);
    expect(r.settingsSections().map((s) => [s.id, s.title, s.order])).toEqual([
      ['mcp', 'AI coding agents', 40],
    ]);
  });

  it('builds the commands with forward slashes', () => {
    expect(claudeCodeCommand('C:\\pv\\pv-engine.exe', 'C:\\code\\shop')).toBe(
      'claude mcp add project-visualizer -- "C:/pv/pv-engine.exe" mcp "C:/code/shop"',
    );
    expect(JSON.parse(mcpJsonConfig('C:\\pv\\pv-engine.exe', 'C:\\code\\shop'))).toEqual({
      mcpServers: {
        'project-visualizer': { command: 'C:/pv/pv-engine.exe', args: ['mcp', 'C:/code/shop'] },
      },
    });
  });

  it('shows copyable commands for the open project', async () => {
    render(<McpSettings />);
    const claude = await screen.findByLabelText('Claude Code');
    expect(claude.textContent).toContain(
      '"C:/Program Files/Project Visualizer/pv-engine.exe" mcp "C:/code/shop"',
    );
    expect(
      screen.getByLabelText('Cursor, Claude Desktop and other MCP clients').textContent,
    ).toContain('"mcpServers"');
    expect(screen.getByRole('list', { name: 'Tools' }).textContent).toContain('pv_impact');
    expect(screen.getByText('Runs locally; nothing is uploaded.')).toBeTruthy();
    fireEvent.click(screen.getAllByRole('button', { name: 'Copy' })[0]);
    await waitFor(() => expect(writeText).toHaveBeenCalledWith(claude.textContent));
  });

  it('asks to open a project first', () => {
    useAppStore.setState({ projectRoot: null });
    render(<McpSettings />);
    expect(screen.getByText(/Open a project first/)).toBeTruthy();
  });
});
