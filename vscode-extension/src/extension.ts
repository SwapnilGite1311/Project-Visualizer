import * as vscode from 'vscode';
import WebSocket from 'ws';
import { BridgeClient, type SocketLike } from './bridge-client';
import { readBridgeInfo } from './bridge-info';

let client: BridgeClient | null = null;

export function activate(context: vscode.ExtensionContext): void {
  const status = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left);
  status.command = 'projectVisualizer.reconnect';
  const showStatus = (connected: boolean) => {
    status.text = connected ? '$(graph) PV' : '$(debug-disconnect) PV';
    status.tooltip = connected ? 'Project Visualizer: connected' : 'Project Visualizer: not connected (click to reconnect)';
  };
  showStatus(false);
  status.show();

  const bridge = new BridgeClient({
    readInfo: () => readBridgeInfo(),
    createSocket: (url) => new WebSocket(url) as unknown as SocketLike,
    onOpen: (file, line) => void openAt(file, line),
    onStatus: showStatus,
  });
  client = bridge;
  bridge.connect();

  const withCursor = (send: (file: string, line: number) => boolean) => () => {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      void vscode.window.showInformationMessage('Open a file first.');
      return;
    }
    if (!send(editor.document.uri.fsPath, editor.selection.active.line + 1)) {
      void vscode.window.showWarningMessage('Project Visualizer is not running or not connected.');
    }
  };

  context.subscriptions.push(
    status,
    vscode.commands.registerCommand('projectVisualizer.showOnMap', withCursor((f, l) => bridge.reveal(f, l))),
    vscode.commands.registerCommand('projectVisualizer.explain', withCursor((f, l) => bridge.explain(f, l))),
    vscode.commands.registerCommand('projectVisualizer.reconnect', () => bridge.reconnect()),
    { dispose: () => bridge.dispose() },
  );
}

async function openAt(file: string, line: number): Promise<void> {
  const doc = await vscode.workspace.openTextDocument(file);
  const editor = await vscode.window.showTextDocument(doc);
  const pos = new vscode.Position(Math.max(0, line - 1), 0);
  editor.selection = new vscode.Selection(pos, pos);
  editor.revealRange(new vscode.Range(pos, pos), vscode.TextEditorRevealType.InCenter);
}

export function deactivate(): void {
  client?.dispose();
  client = null;
}
