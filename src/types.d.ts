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
      onFocusInput: (callback: () => void) => () => void;
    };
  }
}
