const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('gameVault', {
  onTrophyShow: (cb) => ipcRenderer.on('trophy:show', (_, data) => cb(data)),
});
