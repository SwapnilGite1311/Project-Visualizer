import type { StylesheetStyle } from 'cytoscape';

// Uses cytoscape's own StylesheetStyle type (cytoscape 3.3x ships its typings).
export function buildStylesheet(): StylesheetStyle[] {
  return [
    {
      selector: 'node',
      style: {
        'background-color': 'data(color)',
        'border-color': 'data(borderColor)',
        'border-width': 2,
        width: 'data(size)',
        height: 'data(size)',
        shape: 'data(shape)' as never,
        label: 'data(displayLabel)',
        color: '#e5e7eb',
        'font-size': 11,
        'text-valign': 'bottom',
        'text-margin-y': 4,
        opacity: 'data(opacity)' as never,
        'text-outline-color': '#0f1320',
        'text-outline-width': 2,
      },
    },
    { selector: 'node:selected', style: { 'border-width': 4, 'border-color': '#fbbf24' } },
    { selector: 'node.pulse', style: { 'border-width': 5, 'border-style': 'double' } },
    {
      selector: 'edge',
      style: {
        'curve-style': 'bezier',
        'target-arrow-shape': 'triangle',
        'line-color': 'data(color)',
        'target-arrow-color': 'data(color)',
        width: 'data(width)',
        opacity: 'data(opacity)' as never,
        'arrow-scale': 0.8,
      },
    },
    { selector: 'edge.animated', style: { 'line-style': 'dashed', 'line-dash-pattern': [6, 4] } },
  ];
}
