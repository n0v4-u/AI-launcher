export {};

type AiConfig = {
  apiKey: string;
  apiUrl: string;
  model: string;
};

declare global {
  interface Window {
    aiLauncher?: {
      getHotkey: () => Promise<string>;
      hide: () => Promise<void>;
      openExternal: (url: string) => Promise<void>;
      writeClipboard: (text: string) => Promise<void>;
      getAiConfig: () => Promise<AiConfig>;
      saveAiConfig: (config: AiConfig) => Promise<AiConfig>;
      sendDirect: (prompt: string) => Promise<string>;
      sendDirectStream: (
        prompt: string,
        onChunk: (text: string) => void,
        onDone: () => void,
        onError: (err: string) => void,
      ) => void;
      onFocusInput: (callback: () => void) => () => void;
    };
  }
}
