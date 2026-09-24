/// <reference types="vite/client" />
import type { PvBridge } from '../../shared/bridge';
declare global {
  interface Window {
    pv: PvBridge;
  }
}
export {};
