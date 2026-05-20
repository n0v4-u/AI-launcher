import { app, BrowserWindow, Menu, Tray, clipboard, globalShortcut, ipcMain, nativeImage, shell } from 'electron';
import fs from 'node:fs/promises';
import path from 'node:path';

const isDev = !app.isPackaged;
const hotkey = 'CommandOrControl+Shift+Space';

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
};

const defaultAiConfig: AiConfig = {
  apiKey: '',
  apiUrl: 'https://api.openai.com/v1/chat/completions',
  model: 'gpt-4o-mini',
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
  tray.on('click', toggleLauncher);
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

app.whenReady().then(() => {
  if (process.platform === 'win32') {
    app.setAppUserModelId('com.ailauncher.app');
  }

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
  ipcMain.handle('ai:save-config', async (_event, config: AiConfig) => saveAiConfig(config));
  ipcMain.handle('ai:send-direct', async (_event, prompt: string) => sendDirectPrompt(prompt));

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
