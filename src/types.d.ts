export {};

type Provider = {
  id: string;
  name: string;
  description: string;
  icon: string;
  mode: 'external' | 'direct';
  urlTemplate?: string;
  needsClipboard?: boolean;
};

type AiConfig = {
  apiKey: string;
  apiUrl: string;
  model: string;
  hotkey: string;
  providers?: Provider[];
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
      saveProviders: (providers: Provider[]) => Promise<void>;
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
