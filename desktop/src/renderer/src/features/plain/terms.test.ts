import { describe, expect, it } from 'vitest';
import { explainEdge, explainMetric, glossary, plainEdge, plainKind, plainKindPlural, plainMetric, whatIs } from './terms';

describe('plain words', () => {
  it('names kinds in everyday words, or exactly when simple words are off', () => {
    expect(plainKind('module')).toBe('File');
    expect(plainKind('package')).toBe('Folder');
    expect(plainKind('method')).toBe('Function in a class');
    expect(plainKindPlural('module')).toBe('Files');
    expect(plainKindPlural('class')).toBe('Classes');
    expect(plainKind('module', false)).toBe('Module');
    expect(plainKindPlural('package', false)).toBe('Packages');
    expect(plainKind('something')).toBe('Something');
    expect(whatIs('module')).toMatch(/file of code/);
  });

  it('explains metrics and links', () => {
    expect(plainMetric('fan_in')).toBe('Used by');
    expect(plainMetric('fan_in', false)).toBe('Fan-in');
    expect(explainMetric('complexity')).toMatch(/paths/);
    expect(plainEdge('inherits')).toBe('builds on');
    expect(plainEdge('inherits', false)).toBe('inherits');
    expect(explainEdge('imports')).toMatch(/uses code/);
  });

  it('has a glossary with every word explained', () => {
    const g = glossary();
    expect(g.length).toBeGreaterThan(10);
    expect(g.every((r) => r.word && r.simple && r.meaning)).toBe(true);
    expect(g.find((r) => r.word === 'module')?.simple).toBe('File');
  });
});
