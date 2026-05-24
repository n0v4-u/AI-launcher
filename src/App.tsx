import {
  BookOpen,
  Bot,
  BrainCircuit,
  Check,
  ChevronDown,
  ChevronUp,
  Clipboard,
  Cloud,
  Code,
  Compass,
  Cpu,
  ExternalLink,
  Eye,
  EyeOff,
  Globe2,
  Keyboard,
  Lightbulb,
  MessageSquareText,
  Pencil,
  PenTool,
  Plus,
  Save,
  Search,
  Send,
  Settings,
  Sparkles,
  Telescope,
  Trash2,
  X,
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
};

const iconMap: Record<string, React.ComponentType<{ size?: number }>> = {
  bot: Bot,
  sparkles: Sparkles,
  'brain-circuit': BrainCircuit,
  globe: Globe2,
  'message-square-text': MessageSquareText,
  send: Send,
  zap: Zap,
  search: Search,
  cpu: Cpu,
  cloud: Cloud,
  'book-open': BookOpen,
  code: Code,
  'pen-tool': PenTool,
  lightbulb: Lightbulb,
  compass: Compass,
  telescope: Telescope,
};

const availableIcons = [
  { name: 'bot', label: '机器人' },
  { name: 'sparkles', label: '星星' },
  { name: 'brain-circuit', label: '大脑' },
  { name: 'globe', label: '地球' },
  { name: 'message-square-text', label: '消息' },
  { name: 'send', label: '发送' },
  { name: 'zap', label: '闪电' },
  { name: 'search', label: '搜索' },
  { name: 'cpu', label: '芯片' },
  { name: 'cloud', label: '云' },
  { name: 'book-open', label: '书本' },
  { name: 'code', label: '代码' },
  { name: 'pen-tool', label: '写作' },
  { name: 'lightbulb', label: '灯泡' },
  { name: 'compass', label: '指南针' },
  { name: 'telescope', label: '望远镜' },
];

function resolveUrl(template: string, query: string): string {
  return template.replace('{query}', encodeURIComponent(query));
}

function generateId(): string {
  return `custom-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

const defaultConfig: AiConfig = {
  apiKey: '',
  apiUrl: 'https://api.openai.com/v1/chat/completions',
  model: 'gpt-4o-mini',
  hotkey: 'CommandOrControl+Shift+Space',
};

const defaultProviders: Provider[] = [
  {
    id: 'direct',
    name: '直接发送',
    description: '在当前窗口调用 OpenAI 兼容 API，直接返回文本结果',
    icon: 'send',
    mode: 'direct',
  },
  {
    id: 'chatgpt',
    name: 'ChatGPT',
    description: '适合通用问答、写作、翻译和代码辅助',
    icon: 'sparkles',
    mode: 'external',
    urlTemplate: 'https://chat.openai.com/?q={query}',
  },
  {
    id: 'claude',
    name: 'Claude',
    description: '适合长文档分析、产品思考和代码审查',
    icon: 'brain-circuit',
    mode: 'external',
    urlTemplate: 'https://claude.ai/new?q={query}',
  },
  {
    id: 'perplexity',
    name: 'Perplexity',
    description: '适合联网搜索、资料调研和来源引用',
    icon: 'globe',
    mode: 'external',
    urlTemplate: 'https://www.perplexity.ai/search?q={query}',
  },
  {
    id: 'gemini',
    name: 'Gemini',
    description: 'Gemini 不稳定支持 URL 预填，已自动复制问题供粘贴',
    icon: 'message-square-text',
    mode: 'external',
    needsClipboard: true,
    urlTemplate: 'https://gemini.google.com/app',
  },
];

export function App() {
  const [query, setQuery] = useState('');
  const [selectedProviderId, setSelectedProviderId] = useState(defaultProviders[0].id);
  const [hotkey, setHotkey] = useState('Ctrl+Shift+Space');
  const [answer, setAnswer] = useState('');
  const [status, setStatus] = useState('✨ 随时为您效劳...');
  const [isSending, setIsSending] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [recording, setRecording] = useState(false);
  const [answerCopied, setAnswerCopied] = useState(false);
  const [config, setConfig] = useState<AiConfig>(defaultConfig);
  const [providers, setProviders] = useState<Provider[]>(defaultProviders);
  const [editingProviderId, setEditingProviderId] = useState<string | null>(null);
  const [isAddingProvider, setIsAddingProvider] = useState(false);
  const [providerForm, setProviderForm] = useState<Partial<Provider>>({});
  const hotkeyInputRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const thinkingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const selectedProvider = useMemo(
    () => providers.find((provider) => provider.id === selectedProviderId) ?? providers[0],
    [selectedProviderId, providers],
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

  const handleCopyAnswer = useCallback(async () => {
    const text = answer;
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      await window.aiLauncher?.writeClipboard(text);
    }
    setAnswerCopied(true);
    setTimeout(() => setAnswerCopied(false), 1500);
  }, [answer]);

  const handleStartAdd = useCallback(() => {
    setEditingProviderId(null);
    setIsAddingProvider(true);
    setProviderForm({
      name: '',
      description: '',
      icon: 'bot',
      mode: 'external',
      urlTemplate: 'https://example.com/?q={query}',
      needsClipboard: false,
    });
  }, []);

  const handleAddProvider = useCallback(() => {
    const form = providerForm;
    if (!form.name?.trim()) return;
    const newProvider: Provider = {
      id: generateId(),
      name: form.name.trim(),
      description: (form.description ?? '').trim(),
      icon: form.icon ?? 'bot',
      mode: 'external',
      urlTemplate: (form.urlTemplate ?? '').trim(),
      needsClipboard: form.needsClipboard ?? false,
    };
    setProviders((prev) => [...prev, newProvider]);
    setIsAddingProvider(false);
    setProviderForm({});
  }, [providerForm]);

  const handleStartEdit = useCallback((providerId: string) => {
    const provider = providers.find((p) => p.id === providerId);
    if (!provider || provider.mode === 'direct') return;
    setEditingProviderId(providerId);
    setIsAddingProvider(false);
    setProviderForm({ ...provider });
  }, [providers]);

  const handleSaveEdit = useCallback(() => {
    const form = providerForm;
    if (!form.name?.trim() || !editingProviderId) return;
    setProviders((prev) =>
      prev.map((p) =>
        p.id === editingProviderId
          ? {
              ...p,
              name: form.name!.trim(),
              description: (form.description ?? '').trim(),
              icon: form.icon ?? 'bot',
              urlTemplate: (form.urlTemplate ?? '').trim(),
              needsClipboard: form.needsClipboard ?? false,
            }
          : p,
      ),
    );
    setEditingProviderId(null);
    setProviderForm({});
  }, [providerForm, editingProviderId]);

  const handleCancelForm = useCallback(() => {
    setIsAddingProvider(false);
    setEditingProviderId(null);
    setProviderForm({});
  }, []);

  const handleDeleteProvider = useCallback((providerId: string) => {
    const provider = providers.find((p) => p.id === providerId);
    if (!provider || provider.mode === 'direct') return;
    if (!window.confirm(`确定要删除 "${provider.name}" 吗？`)) return;
    setProviders((prev) => prev.filter((p) => p.id !== providerId));
    if (selectedProviderId === providerId) {
      setSelectedProviderId(providers[0]?.id ?? 'direct');
    }
  }, [providers, selectedProviderId]);

  const handleMoveUp = useCallback((index: number) => {
    if (index <= 0) return;
    setProviders((prev) => {
      const next = [...prev];
      [next[index - 1], next[index]] = [next[index], next[index - 1]];
      return next;
    });
  }, []);

  const handleMoveDown = useCallback((index: number) => {
    setProviders((prev) => {
      if (index >= prev.length - 1) return prev;
      const next = [...prev];
      [next[index], next[index + 1]] = [next[index + 1], next[index]];
      return next;
    });
  }, []);

  const saveConfig = async () => {
    if (!window.aiLauncher) {
      setStatus('⚙️ 配置保存功能需要在 Electron 窗口中使用。');
      return;
    }

    try {
      const saved = await window.aiLauncher.saveAiConfig(config);
      setConfig(saved);
      setHotkey(saved.hotkey);
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

  const handleHotkeyRecord = (event: React.KeyboardEvent<HTMLInputElement>) => {
    event.preventDefault();
    if (!recording) return;

    if (event.key === 'Control' || event.key === 'Shift' || event.key === 'Alt' || event.key === 'Meta') return;

    const parts: string[] = [];
    if (event.ctrlKey || event.metaKey) parts.push('CommandOrControl');
    if (event.shiftKey) parts.push('Shift');
    if (event.altKey) parts.push('Alt');

    const code = event.code;
    let key = code;
    if (code.startsWith('Key')) key = code.slice(3);
    else if (code.startsWith('Digit')) key = code.slice(5);

    parts.push(key);
    const accelerator = parts.join('+');
    setConfig((current) => ({ ...current, hotkey: accelerator }));
    setRecording(false);
    hotkeyInputRef.current?.blur();
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
      setStatus('🤔 正在思考中…');
      const startTime = Date.now();
      thinkingTimerRef.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        if (elapsed < 6) {
          setStatus(`🤔 正在思考中… (${elapsed}s)`);
        } else if (elapsed < 12) {
          setStatus(`🧠 正在努力推理中… (${elapsed}s)`);
        } else if (elapsed < 20) {
          setStatus(`🔍 还在深入分析… (${elapsed}s)`);
        } else {
          setStatus(`😅 再等一下，快好了… (${elapsed}s)`);
        }
      }, 1000);
      window.aiLauncher.sendDirectStream(
        text,
        (chunk) => setAnswer((prev) => prev + chunk),
        () => {
          if (thinkingTimerRef.current) {
            clearInterval(thinkingTimerRef.current);
            thinkingTimerRef.current = null;
          }
          const total = Math.floor((Date.now() - startTime) / 1000);
          setStatus(`✅ 已收到回复 (${total}s)`);
          setIsSending(false);
        },
        (error) => {
          if (thinkingTimerRef.current) {
            clearInterval(thinkingTimerRef.current);
            thinkingTimerRef.current = null;
          }
          setStatus(error);
          setShowConfig(true);
          setIsSending(false);
        },
      );
      return;
    }

    if (!selectedProvider.urlTemplate) {
      return;
    }

    if (selectedProvider.needsClipboard) {
      await window.aiLauncher?.writeClipboard(text);
      setStatus('📋 已复制到剪贴板，在 Gemini 中 Ctrl+V 即可');
    }

    const url = resolveUrl(selectedProvider.urlTemplate, text);
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
          <div className="config-panel">
            <section>
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
                <span>快捷键</span>
                <input
                  ref={hotkeyInputRef}
                  value={recording ? '按下快捷键…' : config.hotkey}
                  onFocus={() => setRecording(true)}
                  onBlur={() => setRecording(false)}
                  onKeyDown={handleHotkeyRecord}
                  readOnly
                  className={recording ? 'recording' : ''}
                />
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

            <div className="config-section-separator" />

            <section>
              <div className="config-title">
                <div>
                  <strong>AI 服务管理</strong>
                  <p>添加、编辑、删除或排序可用的 AI 服务。修改即时生效，重启后恢复默认。</p>
                </div>
                {!isAddingProvider && (
                  <button type="button" onClick={handleStartAdd}>
                    <Plus size={16} /> 添加服务
                  </button>
                )}
              </div>

              {isAddingProvider && (
                <div className="provider-form">
                  <div className="form-row">
                    <label>
                      <span>名称</span>
                      <input
                        value={providerForm.name ?? ''}
                        onChange={(e) => setProviderForm((f) => ({ ...f, name: e.target.value }))}
                        placeholder="例如：我的 AI 助手"
                      />
                    </label>
                    <label>
                      <span>图标</span>
                      <select
                        value={providerForm.icon ?? 'bot'}
                        onChange={(e) => setProviderForm((f) => ({ ...f, icon: e.target.value }))}
                      >
                        {availableIcons.map((opt) => (
                          <option key={opt.name} value={opt.name}>{opt.label}</option>
                        ))}
                      </select>
                    </label>
                  </div>
                  <div className="form-row">
                    <label style={{ flex: 1 }}>
                      <span>描述</span>
                      <input
                        value={providerForm.description ?? ''}
                        onChange={(e) => setProviderForm((f) => ({ ...f, description: e.target.value }))}
                        placeholder="简要描述这个服务的用途"
                      />
                    </label>
                  </div>
                  <div className="form-row">
                    <label style={{ flex: 1 }}>
                      <span>URL 模板</span>
                      <input
                        value={providerForm.urlTemplate ?? ''}
                        onChange={(e) => setProviderForm((f) => ({ ...f, urlTemplate: e.target.value }))}
                        placeholder="https://example.com/?q={query}"
                      />
                    </label>
                  </div>
                  <div className="form-row">
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={providerForm.needsClipboard ?? false}
                        onChange={(e) => setProviderForm((f) => ({ ...f, needsClipboard: e.target.checked }))}
                      />
                      <span>自动复制问题到剪贴板（适用于不支持 URL 预填的服务）</span>
                    </label>
                  </div>
                  <div className="form-actions">
                    <button type="button" className="btn-save" onClick={handleAddProvider}>
                      <Check size={16} /> 保存
                    </button>
                    <button type="button" className="btn-cancel" onClick={handleCancelForm}>
                      <X size={16} /> 取消
                    </button>
                  </div>
                </div>
              )}

              <div className="provider-list">
                {providers.map((provider, index) => {
                  if (editingProviderId === provider.id) {
                    return (
                      <div key={provider.id} className="provider-form">
                        <div className="form-row">
                          <label>
                            <span>名称</span>
                            <input
                              value={providerForm.name ?? ''}
                              onChange={(e) => setProviderForm((f) => ({ ...f, name: e.target.value }))}
                              placeholder="例如：我的 AI 助手"
                            />
                          </label>
                          <label>
                            <span>图标</span>
                            <select
                              value={providerForm.icon ?? 'bot'}
                              onChange={(e) => setProviderForm((f) => ({ ...f, icon: e.target.value }))}
                            >
                              {availableIcons.map((opt) => (
                                <option key={opt.name} value={opt.name}>{opt.label}</option>
                              ))}
                            </select>
                          </label>
                        </div>
                        <div className="form-row">
                          <label style={{ flex: 1 }}>
                            <span>描述</span>
                            <input
                              value={providerForm.description ?? ''}
                              onChange={(e) => setProviderForm((f) => ({ ...f, description: e.target.value }))}
                              placeholder="简要描述这个服务的用途"
                            />
                          </label>
                        </div>
                        <div className="form-row">
                          <label style={{ flex: 1 }}>
                            <span>URL 模板</span>
                            <input
                              value={providerForm.urlTemplate ?? ''}
                              onChange={(e) => setProviderForm((f) => ({ ...f, urlTemplate: e.target.value }))}
                              placeholder="https://example.com/?q={query}"
                            />
                          </label>
                        </div>
                        <div className="form-row">
                          <label className="checkbox-label">
                            <input
                              type="checkbox"
                              checked={providerForm.needsClipboard ?? false}
                              onChange={(e) => setProviderForm((f) => ({ ...f, needsClipboard: e.target.checked }))}
                            />
                            <span>自动复制问题到剪贴板（适用于不支持 URL 预填的服务）</span>
                          </label>
                        </div>
                        <div className="form-actions">
                          <button type="button" className="btn-save" onClick={handleSaveEdit}>
                            <Check size={16} /> 保存
                          </button>
                          <button type="button" className="btn-cancel" onClick={handleCancelForm}>
                            <X size={16} /> 取消
                          </button>
                        </div>
                      </div>
                    );
                  }
                  const PIcon = iconMap[provider.icon] ?? Bot;
                  return (
                    <div key={provider.id} className="provider-list-item">
                      <div className="provider-info">
                        <PIcon size={20} />
                        <span className="provider-text">
                          <strong>{provider.name}</strong>
                          <small>{provider.description}</small>
                        </span>
                        <span className={`mode-badge ${provider.mode}`}>
                          {provider.mode === 'direct' ? '直接' : '外部'}
                        </span>
                      </div>
                      <div className="provider-actions">
                        <button
                          type="button"
                          className="icon-btn"
                          disabled={index === 0}
                          onClick={() => handleMoveUp(index)}
                          title="上移"
                        >
                          <ChevronUp size={16} />
                        </button>
                        <button
                          type="button"
                          className="icon-btn"
                          disabled={index === providers.length - 1}
                          onClick={() => handleMoveDown(index)}
                          title="下移"
                        >
                          <ChevronDown size={16} />
                        </button>
                        {provider.mode !== 'direct' && (
                          <>
                            <button
                              type="button"
                              className="icon-btn"
                              onClick={() => handleStartEdit(provider.id)}
                              title="编辑"
                            >
                              <Pencil size={14} />
                            </button>
                            <button
                              type="button"
                              className="icon-btn icon-btn-danger"
                              onClick={() => handleDeleteProvider(provider.id)}
                              title="删除"
                            >
                              <Trash2 size={14} />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          </div>
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
            <div className="answer-head">
              <strong>AI 回复</strong>
              <button className="answer-copy-btn" type="button" onClick={(e) => { e.stopPropagation(); handleCopyAnswer(); }}>
                <Clipboard size={14} />
                <span>{answerCopied ? '已复制' : '复制'}</span>
              </button>
            </div>
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
            const Icon = iconMap[provider.icon] ?? Bot;
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
          <span>直接发送可在界面配置</span>
        </footer>
      </section>
    </main>
  );
}
