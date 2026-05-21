import {
  Bot,
  BrainCircuit,
  Clipboard,
  ExternalLink,
  Eye,
  EyeOff,
  Globe2,
  Keyboard,
  MessageSquareText,
  Save,
  Send,
  Settings,
  Sparkles,
  Zap,
} from 'lucide-react';
import { marked } from 'marked';
import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';

const renderer = new marked.Renderer();
const origCode = renderer.code.bind(renderer);
let codeIdx = 0;
renderer.code = function (opts: { text: string; lang?: string; escaped?: boolean }) {
  const idx = codeIdx++;
  const lang = opts.lang ?? '';
  const html = origCode(opts as Parameters<typeof origCode>[0]);
  return `<div class="code-block"><div class="code-head"><span>${lang}</span><button class="code-copy-btn" data-code-idx="${idx}" type="button"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg><span>复制</span></button></div>${html}</div>`;
};

marked.setOptions({ renderer });

type Provider = {
  id: string;
  name: string;
  description: string;
  icon: typeof Bot;
  mode: 'external' | 'direct';
  buildUrl?: (query: string) => string;
  needsClipboard?: boolean;
};

type AiConfig = {
  apiKey: string;
  apiUrl: string;
  model: string;
};

const defaultConfig: AiConfig = {
  apiKey: '',
  apiUrl: 'https://api.openai.com/v1/chat/completions',
  model: 'gpt-4o-mini',
};

const providers: Provider[] = [
  {
    id: 'direct',
    name: '直接发送',
    description: '在当前窗口调用 OpenAI 兼容 API，直接返回文本结果',
    icon: Send,
    mode: 'direct',
  },
  {
    id: 'chatgpt',
    name: 'ChatGPT',
    description: '适合通用问答、写作、翻译和代码辅助',
    icon: Sparkles,
    mode: 'external',
    buildUrl: (query) => `https://chat.openai.com/?q=${encodeURIComponent(query)}`,
  },
  {
    id: 'claude',
    name: 'Claude',
    description: '适合长文档分析、产品思考和代码审查',
    icon: BrainCircuit,
    mode: 'external',
    buildUrl: (query) => `https://claude.ai/new?q=${encodeURIComponent(query)}`,
  },
  {
    id: 'perplexity',
    name: 'Perplexity',
    description: '适合联网搜索、资料调研和来源引用',
    icon: Globe2,
    mode: 'external',
    buildUrl: (query) => `https://www.perplexity.ai/search?q=${encodeURIComponent(query)}`,
  },
  {
    id: 'gemini',
    name: 'Gemini',
    description: 'Gemini 不稳定支持 URL 预填，已自动复制问题供粘贴',
    icon: MessageSquareText,
    mode: 'external',
    needsClipboard: true,
    buildUrl: () => 'https://gemini.google.com/app',
  },
];

export function App() {
  const [query, setQuery] = useState('');
  const [selectedProviderId, setSelectedProviderId] = useState(providers[0].id);
  const [hotkey, setHotkey] = useState('Ctrl+Shift+Space');
  const [answer, setAnswer] = useState('');
  const [status, setStatus] = useState('✨ 随时为您效劳...');
  const [isSending, setIsSending] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [config, setConfig] = useState<AiConfig>(defaultConfig);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const selectedProvider = useMemo(
    () => providers.find((provider) => provider.id === selectedProviderId) ?? providers[0],
    [selectedProviderId],
  );

  useEffect(() => {
    window.aiLauncher?.getHotkey().then(setHotkey).catch(() => undefined);
    window.aiLauncher?.getAiConfig().then(setConfig).catch(() => undefined);
    return window.aiLauncher?.onFocusInput(() => {
      setTimeout(() => inputRef.current?.focus(), 50);
    });
  }, []);

  const handleAnswerClick = useCallback((e: React.MouseEvent) => {
    const btn = (e.target as HTMLElement).closest('.code-copy-btn') as HTMLButtonElement | null;
    if (!btn) return;

    const block = btn.closest('.code-block');
    const code = block?.querySelector('code')?.textContent ?? '';
    navigator.clipboard.writeText(code).catch(() => {
      window.aiLauncher?.writeClipboard(code);
    });

    btn.classList.add('copied');
    const span = btn.querySelector('span');
    if (span) span.textContent = '已复制';
    setTimeout(() => {
      btn.classList.remove('copied');
      if (span) span.textContent = '复制';
    }, 1500);
  }, []);

  const saveConfig = async () => {
    if (!window.aiLauncher) {
      setStatus('⚙️ 配置保存功能需要在 Electron 窗口中使用。');
      return;
    }

    try {
      const saved = await window.aiLauncher.saveAiConfig(config);
      setConfig(saved);
      setStatus('✨ 配置已保存，尽情使用吧~');
      setShowConfig(false);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : '😵 保存失败，请重试。');
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      launch();
    }
  };

  const launch = async (event?: FormEvent) => {
    event?.preventDefault();
    const text = query.trim();
    if (!text) {
      inputRef.current?.focus();
      return;
    }

    if (selectedProvider.mode === 'direct') {
      if (!window.aiLauncher) {
        setStatus('⚙️ 直接发送功能需要在 Electron 窗口中使用。');
        return;
      }

      setIsSending(true);
      setAnswer('');
      setStatus('🤔 正在思考中...');
      window.aiLauncher.sendDirectStream(
        text,
        (chunk) => setAnswer((prev) => prev + chunk),
        () => {
          setStatus('✅ 已收到回复');
          setIsSending(false);
        },
        (error) => {
          setStatus(error);
          setShowConfig(true);
          setIsSending(false);
        },
      );
      return;
    }

    if (!selectedProvider.buildUrl) {
      return;
    }

    if (selectedProvider.needsClipboard) {
      await window.aiLauncher?.writeClipboard(text);
      setStatus('📋 已复制到剪贴板，在 Gemini 中 Ctrl+V 即可');
    }

    const url = selectedProvider.buildUrl(text);
    if (window.aiLauncher) {
      await window.aiLauncher.openExternal(url);
      if (!selectedProvider.needsClipboard) {
        setQuery('');
        await window.aiLauncher.hide();
      }
      return;
    }

    window.open(url, '_blank', 'noopener,noreferrer');
    if (!selectedProvider.needsClipboard) {
      setQuery('');
    }
  };

  return (
    <main className="app-shell">
      <section className="launcher-card">
        <div className="hero">
          <div>
            <p className="eyebrow"><Zap size={16} /> AI Launcher</p>
            <h1>一个快捷键，直达你的 AI 工作流</h1>
            <p className="subtitle">按下快捷键输入问题，选择模型，可跳转网页，也可直接发送文本。</p>
          </div>
          <div className="hero-actions">
            <button className="config-toggle" type="button" onClick={() => setShowConfig((value) => !value)}>
              <Settings size={17} /> 配置
            </button>
            <div className="hotkey-pill"><Keyboard size={18} /> {hotkey}</div>
          </div>
        </div>

        {showConfig && (
          <section className="config-panel">
            <div className="config-title">
              <div>
                <strong>直接发送配置</strong>
                <p>支持 OpenAI 兼容的 Chat Completions 接口，例如 OpenAI、硅基流动、DeepSeek 网关等。</p>
              </div>
              <button type="button" onClick={saveConfig}><Save size={16} /> 保存</button>
            </div>
            <label>
              <span>API Key</span>
              <div className="secret-input">
                <input
                  type={showApiKey ? 'text' : 'password'}
                  value={config.apiKey}
                  onChange={(event) => setConfig((current) => ({ ...current, apiKey: event.target.value }))}
                  placeholder="sk-..."
                />
                <button type="button" onClick={() => setShowApiKey((value) => !value)}>
                  {showApiKey ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </label>
            <label>
              <span>API 地址</span>
              <input
                value={config.apiUrl}
                onChange={(event) => setConfig((current) => ({ ...current, apiUrl: event.target.value }))}
                placeholder="https://api.openai.com/v1/chat/completions"
              />
            </label>
            <label>
              <span>模型名</span>
              <input
                value={config.model}
                onChange={(event) => setConfig((current) => ({ ...current, model: event.target.value }))}
                placeholder="gpt-4o-mini"
              />
            </label>
          </section>
        )}

        <form className="search-box" onSubmit={launch}>
          <Bot className="search-icon" size={24} />
          <textarea
            ref={inputRef}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="输入你想问 AI 的内容，例如：帮我总结这段代码的优化点"
            autoFocus
            rows={1}
          />
          <button type="submit" disabled={isSending}>
            {isSending ? '发送中' : selectedProvider.mode === 'direct' ? '发送' : '启动'}
            {selectedProvider.mode === 'direct' ? <Send size={16} /> : <ExternalLink size={16} />}
          </button>
        </form>

        <div className="status-line">
          <Clipboard size={15} />
          <span>{status}</span>
        </div>

        {answer && (
          <article className="answer-panel" onClick={handleAnswerClick}>
            <strong>AI 回复</strong>
            <div
              className="answer-content"
              dangerouslySetInnerHTML={{
                __html: ((codeIdx = 0), marked.parse(answer) as string),
              }}
            />
          </article>
        )}

        <div className="providers" aria-label="AI providers">
          {providers.map((provider) => {
            const Icon = provider.icon;
            const isActive = provider.id === selectedProviderId;
            return (
              <button
                key={provider.id}
                className={isActive ? 'provider active' : 'provider'}
                type="button"
                onClick={() => setSelectedProviderId(provider.id)}
              >
                <Icon size={22} />
                <span>
                  <strong>{provider.name}</strong>
                  <small>{provider.description}</small>
                </span>
              </button>
            );
          })}
        </div>

        <footer>
          <span>Enter 启动 / 发送</span>
          <span>Gemini 自动复制问题</span>
          <span>直接发送可在界面配置</span>
        </footer>
      </section>
    </main>
  );
}
