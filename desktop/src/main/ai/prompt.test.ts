import { describe, expect, it } from 'vitest';
import { parseTemplate, renderTemplate } from './prompt';
import { AiError } from './types';

const TEST_CONNECTION =
  'SYSTEM:\nYou are a connection test. Follow the instruction exactly.\n---\nUSER:\nReply with exactly the word OK and nothing else.\n';

describe('prompt templates', () => {
  it('parses the test_connection template', () => {
    expect(parseTemplate(TEST_CONNECTION)).toEqual({
      system: 'You are a connection test. Follow the instruction exactly.',
      user: 'Reply with exactly the word OK and nothing else.',
    });
    expect(parseTemplate(TEST_CONNECTION.replace(/\n/g, '\r\n')).user).toBe(
      'Reply with exactly the word OK and nothing else.',
    );
  });

  it('rejects a template without a separator', () => {
    expect(() => parseTemplate('SYSTEM:\nno separator')).toThrow(AiError);
  });

  it('renders variables and reports missing ones', () => {
    expect(renderTemplate('Explain the {{kind}} named "{{name}}".', { kind: 'class', name: 'User' })).toBe(
      'Explain the class named "User".',
    );
    expect(() => renderTemplate('{{kind}} {{missing}}', { kind: 'x' })).toThrow('missing variable: missing');
  });
});
