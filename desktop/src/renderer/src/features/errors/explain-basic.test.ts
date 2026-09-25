import { describe, expect, it } from 'vitest';
import { dictionaryEntries, explainBasic } from './explain-basic';

describe('explainBasic', () => {
  it('finds known error types', () => {
    expect(explainBasic('python', 'KeyError').plain).toBe(
      'The code asked a dictionary for a key that is not in it.',
    );
    expect(explainBasic('java', 'java.lang.NullPointerException').title).toBe('Used a null value');
    expect(explainBasic('go', 'panic').title).toBe('Program panic');
    expect(explainBasic('go', 'panic: runtime error: index out of range').title).toBe(
      'Program panic',
    );
    expect(explainBasic('csharp', 'System.NullReferenceException').causes.length).toBeGreaterThan(
      0,
    );
  });

  it('falls back to a generic explanation', () => {
    expect(explainBasic('python', 'WeirdError')).toEqual({
      title: 'WeirdError',
      plain: 'The program stopped because of an error of type WeirdError.',
      causes: [],
    });
    expect(explainBasic('javascript', 'KeyError').title).toBe('KeyError'); // per language
    expect(explainBasic('unknown', 'KeyError').title).toBe('Missing dictionary key'); // no stack: any language
  });

  it('has complete entries for every required type', () => {
    const entries = dictionaryEntries();
    const required = [
      ...[
        'KeyError',
        'IndexError',
        'AttributeError',
        'TypeError',
        'ValueError',
        'NameError',
        'ImportError',
        'ModuleNotFoundError',
        'ZeroDivisionError',
        'FileNotFoundError',
        'RecursionError',
        'AssertionError',
      ].map((t) => 'python:' + t),
      ...['TypeError', 'ReferenceError', 'RangeError', 'SyntaxError'].map((t) => 'javascript:' + t),
      ...[
        'NullPointerException',
        'ArrayIndexOutOfBoundsException',
        'ClassCastException',
        'IllegalArgumentException',
        'IllegalStateException',
      ].map((t) => 'java:java.lang.' + t),
      'go:panic',
      ...[
        'NullReferenceException',
        'ArgumentException',
        'InvalidOperationException',
        'IndexOutOfRangeException',
      ].map((t) => 'csharp:System.' + t),
    ];
    for (const key of required) expect(entries[key], key).toBeDefined();
    for (const [key, e] of Object.entries(entries)) {
      expect(typeof e.title === 'string' && e.title.length > 0, key).toBe(true);
      expect(typeof e.plain === 'string' && e.plain.length > 0, key).toBe(true);
      expect(Array.isArray(e.causes), key).toBe(true);
    }
  });
});
