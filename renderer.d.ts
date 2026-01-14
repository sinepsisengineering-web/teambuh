// renderer.d.ts
import { ProgressInfo, UpdateMessage } from './types';

export interface IElectronAPI {
  getVersion: () => Promise<string>;
  checkUpdates: () => void;
  restartApp: () => void;
  showNotification: (title: string, body: string) => void;
  showConfirmDialog: (options: { message: string; detail?: string }) => Promise<boolean>;
  
  // === НОВЫЕ ТИПЫ ===
  getAutoLaunch: () => Promise<boolean>;
  setAutoLaunch: (enable: boolean) => Promise<void>;
  // ==================
  
  onUpdateMessage: (callback: (message: UpdateMessage) => void) => () => void;
  onUpdateProgress: (callback: (progressInfo: ProgressInfo) => void) => () => void;
}

declare global {
  interface Window {
    electronAPI: IElectronAPI;
  }
}