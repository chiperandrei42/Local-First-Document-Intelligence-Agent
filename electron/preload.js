const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  isElectron: true,
  platform: process.platform,
  getSystemSpecs: () => ipcRenderer.invoke('get-system-specs'),
  startOllama: () => ipcRenderer.invoke('start-ollama'),
  checkOllama: () => ipcRenderer.invoke('check-ollama'),
  checkBackend: () => ipcRenderer.invoke('check-backend'),
  openExternal: (url) => ipcRenderer.invoke('open-external', url),
  minimize: () => ipcRenderer.invoke('window-minimize'),
  maximize: () => ipcRenderer.invoke('window-maximize'),
  close: () => ipcRenderer.invoke('window-close'),
});
