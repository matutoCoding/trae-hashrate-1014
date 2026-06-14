const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform,
  versions: process.versions,

  openFileDialog: (options) => ipcRenderer.invoke('dialog:openFile', options),
  saveFileDialog: (options) => ipcRenderer.invoke('dialog:saveFile', options),

  readFile: (filePath) => ipcRenderer.invoke('file:read', filePath),
  writeFile: (filePath, data) => ipcRenderer.invoke('file:write', filePath, data),

  getAppVersion: () => ipcRenderer.invoke('app:getVersion'),

  onMenuImportAudio: (callback) => {
    ipcRenderer.on('menu:import-audio', callback);
  },
  onMenuImportScript: (callback) => {
    ipcRenderer.on('menu:import-script', callback);
  },
  onMenuSave: (callback) => {
    ipcRenderer.on('menu:save', callback);
  },
  onMenuExport: (callback) => {
    ipcRenderer.on('menu:export', callback);
  },
  onMenuTogglePlay: (callback) => {
    ipcRenderer.on('menu:toggle-play', callback);
  },
  onMenuResetPlayback: (callback) => {
    ipcRenderer.on('menu:reset-playback', callback);
  },
});
