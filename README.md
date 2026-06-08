# 🚀 AI Launcher

AI Launcher 是一个桌面端全局快捷键 AI 启动器。

按下 `Ctrl/Command + Shift + Space`，即可快速唤起 AI 对话，无需频繁切换浏览器标签页。

> 🚧 项目仍在持续开发中

---

## ✨ 功能特性

- ⚡ 全局快捷键快速唤起启动器，支持 UI 内自定义录制
- 🪟 轻量透明窗口，失焦自动隐藏，类似系统级搜索框
- 🤖 支持多个 AI 服务入口（ChatGPT、Claude、Perplexity、Gemini），可自由增删改排序
- 💬 支持应用内直接与 AI 对话（OpenAI 兼容接口），实时流式输出
- ⌛ 推理过程俏皮计时提示，缓解等待焦虑
- 📝 多行输入支持（Shift+Enter 换行，Enter 发送）
- 🎨 AI 回复支持 Markdown 渲染，代码块一键复制
- 🖥️ 系统托盘常驻
- 🚀 支持开机自启动（需打包安装后生效）
- 📦 已配置基础打包脚本，可直接安装作为桌面应用

---

### ⚡ 一键启动

Windows 可直接双击项目根目录下：

```text
start-dev.bat
```

它会自动完成：

1. 📂 进入项目目录  
2. 📥 自动安装依赖（如果未安装）  
3. ⚛️ 启动 Vite 前端开发服务  
4. 🚀 等待服务可用后启动 Electron  
5. 🖥️ 保持托盘图标和全局快捷键可用  

启动后按：

```text
Ctrl/Command + Shift + Space
```

即可呼出 **AI Launcher**。

---

### 🔧 命令行启动

也可以运行：

```bash
npm run dev:all
```

或者分别打开两个终端：

终端 1：

```bash
npm run dev
```

终端 2：

```bash
npm run electron:dev
```

---

## 📦 安装 / 打包

### 安装（推荐）

前往 GitHub 的 **Releases** 页面下载最新版本：

```text
AI Launcher Setup.exe
```

下载后双击安装即可使用。

---

### 本地打包

如果你想自行构建：

```bash
npm run package
```

打包产物输出到：

```text
release/
├── AI Launcher Setup 0.1.0.exe   ← 安装包
└── win-unpacked/                  ← 绿色便携版（可直接运行）
```

> 💡 **中国大陆用户**：打包时需要从 GitHub 下载 Electron 和工具链，建议设置镜像加速：
>
> ```bash
> export ELECTRON_MIRROR=https://npmmirror.com/mirrors/electron/
> export ELECTRON_BUILDER_BINARIES_MIRROR=https://npmmirror.com/mirrors/electron-builder-binaries/
> npm run package
> ```

---

## 💬 应用内直接对话

支持在应用内可视化配置 API，无需手动设置环境变量。

使用步骤：

1. 按快捷键打开 AI Launcher  
2. 点击右上角 **配置**  
3. 填写：
   - `API Key`
   - `快捷键`（点击输入框后直接按下组合键录制）
   - `开机自启动`（开启后系统启动时自动运行）
   - `API 地址`
   - `模型名`
4. 点击 **保存**
5. 选择 **直接发送**
6. 输入问题后按 Enter

默认 API 地址：

```text
https://api.openai.com/v1/chat/completions
```

兼容：

```text
OpenAI Chat Completions API
```

也支持其他 OpenAI 兼容接口。

---

## ⌨️ 快捷键

默认快捷键为 `Ctrl/Command + Shift + Space`。

在配置面板中点击快捷键输入框，按下想要设置的组合键即可自定义，无需编辑代码。

---

## 🛠️ 自定义 AI 服务

在配置面板中可以自由管理 AI 服务列表：

- **添加服务** — 点击"添加服务"，填写名称、图标、描述和 URL 模板（支持 `{query}` 占位符）
- **编辑服务** — 点击服务右侧的铅笔图标
- **删除服务** — 点击红色垃圾桶图标（内置"直接发送"不可删除）
- **排序** — 点击上下箭头调整服务显示顺序
- **自动保存** — 修改即时生效，重启后仍然保留

---

## 🗺️ 开发路线图

- [x] 自定义 AI 服务列表
- [x] 自定义快捷键配置
- [x] 系统托盘常驻
- [ ] 本地历史记录
- [x] 流式输出（Streaming）
- [x] 开机自启动
- [ ] 接入 OpenAI / Claude / Gemini 原生 API
- [ ] 支持选中文本后快捷提问
- [x] Markdown 渲染 & 代码块复制
- [x] 多行输入（Shift+Enter 换行）

---

## 📄 License

MIT