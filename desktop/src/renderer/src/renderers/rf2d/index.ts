import type { RendererEntry } from '../../view/renderer-types';
import { RfRenderer } from './rf-renderer';

export const renderer: RendererEntry = {
  id: 'rf2d',
  label: 'React Flow',
  mode: '2d',
  preferred: true,
  layout: 'engine',
  create: () => new RfRenderer(),
};
