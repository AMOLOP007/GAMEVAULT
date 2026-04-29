import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('gameVault', {
  onTrophyShow: (cb: (data: any) => void) => ipcRenderer.on('trophy:show', (_, data) => cb(data)),
});
