import type { RendererEntry } from '../../view/renderer-types';
import { R3fRenderer } from './r3f-renderer';

export const renderer: RendererEntry = {
  id: 'r3f',
  label: 'React Three Fiber',
  mode: '3d',
  preferred: true,
  layout: 'engine',
  create: () => new R3fRenderer(),
};
