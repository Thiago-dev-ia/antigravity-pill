const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('pill', {
  getSnapshot: () => ipcRenderer.invoke('pill:get-snapshot'),
  refresh: () => ipcRenderer.invoke('pill:refresh'),
  hide: () => ipcRenderer.send('pill:hide'),
  setInteractive: (interactive) => ipcRenderer.send('pill:set-interactive', interactive),
  onSnapshot: (cb) => ipcRenderer.on('pill:snapshot', (_e, snap) => cb(snap)),
});
