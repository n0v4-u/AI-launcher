import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('aiLauncher', {
  getHotkey: () => ipcRenderer.invoke('app:get-hotkey'),
  hide: () => ipcRenderer.invoke('app:hide'),
  openExternal: (url: string) => ipcRenderer.invoke('app:open-external', url),
  writeClipboard: (text: string) => ipcRenderer.invoke('app:write-clipboard', text),
  getAiConfig: () => ipcRenderer.invoke('ai:get-config'),
  saveAiConfig: (config: { apiKey: string; apiUrl: string; model: string }) => ipcRenderer.invoke('ai:save-config', config),
  sendDirect: (prompt: string) => ipcRenderer.invoke('ai:send-direct', prompt),
  sendDirectStream: (
    prompt: string,
    onChunk: (text: string) => void,
    onDone: () => void,
    onError: (err: string) => void,
  ) => {
    const chunkListener = (_event: Electron.IpcRendererEvent, text: string) => onChunk(text);
    const doneListener = () => {
      cleanup();
      onDone();
    };
    const errorListener = (_event: Electron.IpcRendererEvent, err: string) => {
      cleanup();
      onError(err);
    };

    ipcRenderer.on('ai:stream-chunk', chunkListener);
    ipcRenderer.once('ai:stream-done', doneListener);
    ipcRenderer.once('ai:stream-error', errorListener);

    ipcRenderer.send('ai:send-direct-stream', prompt);

    function cleanup() {
      ipcRenderer.removeListener('ai:stream-chunk', chunkListener);
      ipcRenderer.removeListener('ai:stream-done', doneListener);
      ipcRenderer.removeListener('ai:stream-error', errorListener);
    }
  },
  onFocusInput: (callback: () => void) => {
    const listener = () => callback();
    ipcRenderer.on('launcher:focus-input', listener);
    return () => ipcRenderer.removeListener('launcher:focus-input', listener);
  },
});
