import { app, BrowserWindow, Menu, Tray, clipboard, globalShortcut, ipcMain, nativeImage, shell } from 'electron';
import fs from 'node:fs/promises';
import path from 'node:path';

const isDev = !app.isPackaged;
let hotkey = 'CommandOrControl+Shift+Space';

function getIconPath(name: string) {
  const base = isDev
    ? path.join(process.cwd(), 'build')
    : path.join(process.resourcesPath, 'build');
  return path.join(base, name);
}

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;

type AiConfig = {
  apiKey: string;
  apiUrl: string;
  model: string;
  hotkey: string;
};

const defaultAiConfig: AiConfig = {
  apiKey: '',
  apiUrl: 'https://api.openai.com/v1/chat/completions',
  model: 'gpt-4o-mini',
  hotkey: 'CommandOrControl+Shift+Space',
};

function getConfigPath() {
  return path.join(app.getPath('userData'), 'ai-config.json');
}

async function readAiConfig(): Promise<AiConfig> {
  try {
    const content = await fs.readFile(getConfigPath(), 'utf-8');
    const saved = JSON.parse(content) as Partial<AiConfig>;
    return {
      apiKey: saved.apiKey ?? '',
      apiUrl: saved.apiUrl ?? defaultAiConfig.apiUrl,
      model: saved.model ?? defaultAiConfig.model,
      hotkey: saved.hotkey ?? defaultAiConfig.hotkey,
    };
  } catch {
    return defaultAiConfig;
  }
}

async function saveAiConfig(config: AiConfig) {
  const normalized: AiConfig = {
    apiKey: config.apiKey.trim(),
    apiUrl: config.apiUrl.trim() || defaultAiConfig.apiUrl,
    model: config.model.trim() || defaultAiConfig.model,
    hotkey: config.hotkey.trim() || defaultAiConfig.hotkey,
  };
  await fs.mkdir(path.dirname(getConfigPath()), { recursive: true });
  await fs.writeFile(getConfigPath(), JSON.stringify(normalized, null, 2), 'utf-8');
  return normalized;
}

function createTray() {
  if (tray) {
    return;
  }

  tray = new Tray(getIconPath('icon-16.png'));
  tray.setToolTip('AI Launcher');
  refreshTrayMenu();
  tray.on('click', toggleLauncher);
}

function refreshTrayMenu() {
  if (!tray) return;
  tray.setContextMenu(
    Menu.buildFromTemplate([
      {
        label: '显示 / 隐藏 AI Launcher',
        click: toggleLauncher,
      },
      {
        label: `快捷键：${hotkey}`,
        enabled: false,
      },
      { type: 'separator' },
      {
        label: '退出',
        click: () => app.quit(),
      },
    ]),
  );
}

function registerHotkey(newHotkey: string) {
  globalShortcut.unregisterAll();
  const ok = globalShortcut.register(newHotkey, toggleLauncher);
  if (!ok) {
    globalShortcut.register(hotkey, toggleLauncher);
    throw new Error(`快捷键 "${newHotkey}" 注册失败，可能已被占用或格式无效。`);
  }
  hotkey = newHotkey;
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 860,
    height: 760,
    minWidth: 700,
    minHeight: 620,
    show: false,
    icon: nativeImage.createFromPath(getIconPath('icon.png')),
    frame: false,
    alwaysOnTop: true,
    resizable: true,
    transparent: true,
    backgroundColor: '#00000000',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.on('blur', () => {
    if (!mainWindow?.webContents.isDevToolsOpened()) {
      mainWindow?.hide();
    }
  });

  if (isDev) {
    mainWindow.loadURL('http://127.0.0.1:5173');
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }
}

function toggleLauncher() {
  if (!mainWindow) {
    return;
  }

  if (mainWindow.isVisible()) {
    mainWindow.hide();
    return;
  }

  mainWindow.center();
  mainWindow.show();
  mainWindow.focus();
  mainWindow.webContents.send('launcher:focus-input');
}

async function sendDirectPrompt(prompt: string) {
  const config = await readAiConfig();
  if (!config.apiKey) {
    throw new Error('请先点击“配置”填写 API Key，再使用直接发送功能。');
  }

  const response = await fetch(config.apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model: config.model,
      messages: [
        {
          role: 'system',
          content: 'You are a helpful desktop AI assistant. Reply in the same language as the user when possible.',
        },
        { role: 'user', content: prompt },
      ],
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`AI 请求失败：${response.status} ${errorText}`);
  }

  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };

  return data.choices?.[0]?.message?.content?.trim() ?? '没有收到有效回复。';
}

async function sendDirectPromptStream(prompt: string) {
  const config = await readAiConfig();
  if (!config.apiKey) {
    mainWindow?.webContents.send('ai:stream-error', '请先点击"配置"填写 API Key，再使用直接发送功能。');
    return;
  }

  let response: Response;
  try {
    response = await fetch(config.apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model: config.model,
        messages: [
          {
            role: 'system',
            content: 'You are a helpful desktop AI assistant. Reply in the same language as the user when possible.',
          },
          { role: 'user', content: prompt },
        ],
        temperature: 0.7,
        stream: true,
      }),
    });
  } catch (err) {
    mainWindow?.webContents.send('ai:stream-error', `网络请求失败：${err instanceof Error ? err.message : '未知错误'}`);
    return;
  }

  if (!response.ok) {
    const errorText = await response.text().catch(() => '');
    mainWindow?.webContents.send('ai:stream-error', `AI 请求失败：${response.status} ${errorText}`);
    return;
  }

  const reader = response.body?.getReader();
  if (!reader) {
    mainWindow?.webContents.send('ai:stream-error', '无法读取响应流');
    return;
  }

  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith('data:')) continue;

        const rawData = trimmed.slice(5).trim();
        if (rawData === '[DONE]') {
          mainWindow?.webContents.send('ai:stream-done');
          return;
        }

        try {
          const parsed = JSON.parse(rawData);
          const content = parsed.choices?.[0]?.delta?.content;
          if (content) {
            mainWindow?.webContents.send('ai:stream-chunk', content);
          }
        } catch {
          // skip malformed JSON chunks
        }
      }
    }

    mainWindow?.webContents.send('ai:stream-done');
  } catch (err) {
    mainWindow?.webContents.send('ai:stream-error', `流读取中断：${err instanceof Error ? err.message : '未知错误'}`);
  }
}

app.whenReady().then(async () => {
  if (process.platform === 'win32') {
    app.setAppUserModelId('com.ailauncher.app');
  }

  const config = await readAiConfig();
  hotkey = config.hotkey;

  createWindow();
  createTray();

  const registered = globalShortcut.register(hotkey, toggleLauncher);
  if (!registered) {
    console.warn(`Failed to register global shortcut: ${hotkey}`);
  }

  ipcMain.handle('app:get-hotkey', () => hotkey);
  ipcMain.handle('app:hide', () => mainWindow?.hide());
  ipcMain.handle('app:open-external', async (_event, url: string) => {
    await shell.openExternal(url);
  });
  ipcMain.handle('app:write-clipboard', (_event, text: string) => {
    clipboard.writeText(text);
  });
  ipcMain.handle('ai:get-config', async () => readAiConfig());
  ipcMain.handle('ai:save-config', async (_event, cfg: AiConfig) => {
    const saved = await saveAiConfig(cfg);
    if (cfg.hotkey !== hotkey) {
      registerHotkey(cfg.hotkey);
      refreshTrayMenu();
    }
    return saved;
  });
  ipcMain.handle('ai:send-direct', async (_event, prompt: string) => sendDirectPrompt(prompt));
  ipcMain.on('ai:send-direct-stream', (_event, prompt: string) => {
    sendDirectPromptStream(prompt);
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
