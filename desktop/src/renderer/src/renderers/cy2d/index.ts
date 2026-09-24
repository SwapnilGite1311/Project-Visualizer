import type { RendererEntry } from '../../view/renderer-types';
import { CyRenderer } from './cy-renderer';

export const renderer: RendererEntry = { mode: '2d', create: () => new CyRenderer() };
