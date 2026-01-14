// preload.js
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Запрос версии
  getVersion: () => ipcRenderer.invoke('get-app-version'),
  
  // Отправка команд
  checkUpdates: () => ipcRenderer.send('check-for-updates'),
  restartApp: () => ipcRenderer.send('restart_app'),
  showNotification: (title, body) => ipcRenderer.send('show-notification', { title, body }),

  // Диалог подтверждения
  showConfirmDialog: (options) => ipcRenderer.invoke('show-confirm-dialog', options),

  // ==================== НОВОЕ: УПРАВЛЕНИЕ АВТОЗАПУСКОМ ====================
  getAutoLaunch: () => ipcRenderer.invoke('get-auto-launch'),
  setAutoLaunch: (enable) => ipcRenderer.invoke('set-auto-launch', enable),
  // ========================================================================

  // Прослушивание событий
  onUpdateMessage: (callback) => {
    const listener = (_event, message) => callback(message);
    ipcRenderer.on('update-message', listener);
    return () => ipcRenderer.removeListener('update-message', listener);
  },
  onUpdateProgress: (callback) => {
    const listener = (_event, progressInfo) => callback(progressInfo);
    ipcRenderer.on('update-progress', listener);
    return () => ipcRenderer.removeListener('update-progress', listener);
  },
});