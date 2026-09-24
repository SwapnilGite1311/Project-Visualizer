import { AiError } from './types';

export function parseTemplate(text: string): { system: string; user: string } {
  const lines = text.replace(/\r\n/g, '\n').split('\n');
  const separator = lines.findIndex((line) => line === '---');
  if (separator < 0) throw new AiError('bad_template', 'template has no --- separator');
  const systemLines = lines.slice(0, separator);
  const userLines = lines.slice(separator + 1);
  if (systemLines[0]?.trim() === 'SYSTEM:') systemLines.shift();
  if (userLines[0]?.trim() === 'USER:') userLines.shift();
  return { system: systemLines.join('\n').trim(), user: userLines.join('\n').trim() };
}

export function renderTemplate(text: string, vars: Record<string, string>): string {
  return text.replace(/\{\{([a-zA-Z0-9_]+)\}\}/g, (_match, name: string) => {
    const value = vars[name];
    if (value === undefined) throw new AiError('bad_template', `missing variable: ${name}`);
    return value;
  });
}
