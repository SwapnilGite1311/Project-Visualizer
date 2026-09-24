import type { RendererEntry } from '../../view/renderer-types';
import { Fg3dRenderer } from './fg-renderer';

export const renderer: RendererEntry = { mode: '3d', create: () => new Fg3dRenderer() };
