import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('aiLauncher', {
  getHotkey: () => ipcRenderer.invoke('app:get-hotkey'),
  hide: () => ipcRenderer.invoke('app:hide'),
  openExternal: (url: string) => ipcRenderer.invoke('app:open-external', url),
  writeClipboard: (text: string) => ipcRenderer.invoke('app:write-clipboard', text),
  getAiConfig: () => ipcRenderer.invoke('ai:get-config'),
  saveAiConfig: (config: { apiKey: string; apiUrl: string; model: string }) => ipcRenderer.invoke('ai:save-config', config),
  sendDirect: (prompt: string) => ipcRenderer.invoke('ai:send-direct', prompt),
  onFocusInput: (callback: () => void) => {
    const listener = () => callback();
    ipcRenderer.on('launcher:focus-input', listener);
    return () => ipcRenderer.removeListener('launcher:focus-input', listener);
  },
});
