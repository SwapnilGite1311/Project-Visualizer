import { contextBridge, ipcRenderer } from 'electron';
import { createBridge } from './bridge-impl';

contextBridge.exposeInMainWorld('pv', createBridge(ipcRenderer));
