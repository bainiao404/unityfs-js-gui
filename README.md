# unityfs-gui

一个跨平台 Unity 资源解析、提取与可视化编辑客户端。本项目基于 Vue 3 + Vite 构建，结合底层核心解析库 `unityfs-js`，提供纯前端、无服务端依赖的 AssetBundle 解包与序列化重包完整工作流。

## 核心特性

- **跨平台运行时支持**：支持构建和分发为标准的网页端（Web）、桌面端（Electron）以及移动端（Cordova App）应用。
- **多功能资产预览**：
  - **图片与精灵 (Texture2D / Sprite)**：支持各类压缩纹理格式（如 DXT1/5, BC7 等）的自动解码预览，并支持对 Sprite 进行边界裁切与位置偏移导出。
  - **音频资产 (AudioClip)**：解析 FSB5 音频容器，支持在线播放并导出为 WAV 或 OGG 格式文件。
  - **文本资产 (TextAsset)**：提供内置文本查看器并支持 JSON 语法高亮。
  - **三维模型网格 (Mesh / SkinnedMesh)**：支持解析并渲染 OBJ 格式及带骨骼动画的 GLTF/GLB 格式 3D 模型。
  - **自定义类 (MonoBehaviour)**：支持通过底层类型树（TypeTrees）动态反序列化并展开任意 C# 组件的字段结构。
  - **Live2D 导出链**：支持完整导出 Cubism 角色骨骼、纹理及动作数据并生成对应的 `.moc3` 配置文件。
- **配置与资产编辑（Editing）**：
  - 支持直接在客户端内修改 `TextAsset` 的文本数据。
  - 支持注入外部 `PNG` 图像以替换 `Texture2D` 数据。
  - 支持修改 `MonoBehaviour` 的自定义属性值，并控制节点 `enabled` 的状态。
- **资产重包与安全校验（Repacking & CRC Spoofing）**：
  - 支持将修改后的脏数据整体重新打包，生成全新的 `.bundle` 格式物理二进制包（自动维持原始文件分块与 LZ4 压缩参数的一致性）。
  - **全自动 CRC 对齐**：打包时会自动根据原包 CAB 序列化头，反向计算并对齐最终输出文件的 CRC-32 校验和，以满足游戏客户端在签名校验下的加载要求。

---

## 本地开发指南

### 1. 安装项目依赖
执行依赖安装时，系统会自动触发 `scripts/install-electron.cjs` 脚本。该脚本通过 `@electron/get` 下载并解压指定版本的原生 Electron 运行时至本地 `dist/electron` 目录：
```bash
npm install
```

### 2. 启动开发服务器 (Vite Dev Server)
```bash
npm run dev
```

---

## 多端打包编译命令

编译生成的产物统一输出在项目根目录的 `dist/` 文件夹中进行分类隔离：

### 1. 网页端部署 (Web target)
```bash
npm run build:web
```
- **产物目录**：`dist/web/`
- **说明**：生成纯前端静态 SPA 资源包，可直接部署于 Nginx、CDN 或静态托管服务上。

### 2. 桌面客户端打包 (Electron target)
```bash
npm run build:electron
```
- **产物目录**：`dist/electron/`
- **说明**：在编译前端代码后，脚本会自动将 Electron 主进程文件与运行配置部署至 `dist/electron/resources/app`。
- **运行方式**：构建成功后，直接运行 `dist/electron/unityfs-gui.exe` 即可。

### 3. 移动端 App 构建 (Cordova target)
```bash
npm run build:cordova
```
- **产物目录**：`dist/cordova/`
- **说明**：编译生成移动端优化后的代码，并自动同步至 `cordova/www/` 目录下。

### 4. 白鸟GKD 容器联调 (BainiaoGKD target)
```bash
npm run build:bainiaogkd
```
- **说明**：将代码编译后拷贝至主白鸟 GKD 软件的对应应用位置进行联动调试。

---

## Cordova 打包 Android 应用包流程

在执行完多端打包命令后，若需要编译为 Android 原生 APK，请遵循以下流程：

### 前置条件
确保本地开发环境已配置 **Java JDK 8**、**Android SDK (Command Line Tools)** 并全局安装了 **Cordova CLI** 工具。

### 打包步骤
```bash
# 1. 编译前端 Cordova 资产并自动同步
npm run build:cordova

# 2. 进入 cordova 文件夹
cd cordova

# 3. 添加 Android 平台工程 (仅需在首次打包时运行)
cordova platform add android

# 4. 运行编译指令，生成 Android 安装包 (.apk)
cordova build android

# 5. 生成的 APK 文件位于以下路径：
# cordova/platforms/android/app/build/outputs/apk/debug/app-debug.apk
```
