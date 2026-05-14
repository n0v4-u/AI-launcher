# 🚀 AI Launcher

AI Launcher 是一个桌面端全局快捷键 AI 启动器。

按下 `Ctrl/Command + Shift + Space`，即可快速唤起 AI 对话，无需频繁切换浏览器标签页。

> 🚧 项目仍在持续开发中

---

## ✨ 功能特性

- ⚡ 全局快捷键快速唤起启动器
- 🪟 轻量窗口，失焦自动隐藏，类似系统级搜索框
- 🤖 支持多个 AI 服务入口
- 💬 支持应用内直接与 AI 对话（OpenAI 兼容接口）
- 📋 Gemini 自动复制问题到剪贴板，解决网页不支持 URL 预填的问题
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
```

---

## 💬 应用内直接对话

支持在应用内可视化配置 API，无需手动设置环境变量。

使用步骤：

1. 按 `Ctrl/Command + Shift + Space` 打开 AI Launcher  
2. 点击右上角 **配置**  
3. 填写：
   - `API Key`
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

默认快捷键：

```text
Ctrl/Command + Shift + Space
```

可在：

```text
electron/main.ts
```

中修改 `hotkey` 常量。

---

## 🗺️ 开发路线图

- [ ] 自定义 AI 服务列表
- [ ] 自定义快捷键配置
- [x] 系统托盘常驻
- [ ] 本地历史记录
- [ ] 流式输出（Streaming）
- [ ] 接入 OpenAI / Claude / Gemini API
- [ ] 支持选中文本后快捷提问
- [ ] 更现代化 UI

---

## 📄 License

MIT