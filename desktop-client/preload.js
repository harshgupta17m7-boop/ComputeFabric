const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  getState: () => ipcRenderer.invoke('get-state'),
  setAllocation: (caps) => ipcRenderer.send('set-allocation', caps),
  onStateUpdate: (callback) => ipcRenderer.on('state-update', (_event, value) => callback(value)),
  onLogMessage: (callback) => ipcRenderer.on('log-message', (_event, value) => callback(value))
});
