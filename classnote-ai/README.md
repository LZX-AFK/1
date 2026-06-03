# ClassNote AI

> 把每一堂课，变成你的专属笔记
> Turn every class into your personal smart notes.

基于 Oleap 降噪耳机技术，面向海外学生的课堂 AI 笔记 SaaS App（MVP v0.1.0）

---

## 功能特性

- **实时录音转写** — 课堂实时语音识别，支持 6 种语言（en/zh/ja/ko/es/fr）
- **AI 课堂总结** — GPT-4o 自动提炼要点、关键词、行动项
- **时间轴标记** — 录音过程中一键插入书签，精准定位重要时刻
- **WebSocket 断线重连** — 指数退避自动重连（初始 3s，最大 30s，最多 10 次）
- **离线容错** — 断线期间消息入队，重连后自动补发
- **骨架屏 + 防抖** — 全页面骨架屏加载、按钮操作防抖，流畅体验

## 技术栈

| 层 | 技术 |
|---|---|
| 前端框架 | uni-app (Vue 3 + TypeScript + Composition API) |
| 状态管理 | Pinia |
| 国际化 | vue-i18n v9 |
| 样式 | Sass + UnoCSS |
| 构建工具 | Vite + @dcloudio/vite-plugin-uni |
| 后端 | Fastify (oleap-fastify-demo) |
| ASR | Deepgram WebSocket Streaming |
| AI 总结 | GPT-4o |
| 目标平台 | iOS / Android（及 H5 预览） |

## 页面结构

```
pages/
├── home/index.vue          # P01 首页 (tabBar)
├── courses/
│   ├── index.vue           # P05 我的课程 (tabBar)
│   └── detail.vue          # P06 课程详情
├── record/
│   ├── prepare.vue         # P11 准备录音
│   ├── live.vue            # P12 实时转写（核心）
│   └── summary.vue         # P15 AI 课堂总结
├── knowledge/index.vue     # 知识库 (tabBar)
└── profile/index.vue       # 我的 (tabBar)
```

## 快速开始

### 环境要求

- Node.js >= 18
- pnpm >= 8（或 npm/yarn）

### 安装依赖

```bash
cd classnote-ai
pnpm install
```

### H5 开发预览

```bash
pnpm dev:h5
# 访问 http://localhost:5173
```

### Android 打包

> 需要 HBuilderX（DCloud 官方 IDE）

1. 使用 HBuilderX 打开 `classnote-ai/` 目录
2. 菜单 → 发行 → 原生 App-云打包 / 本地打包
3. 配置 Android 签名后生成 APK

### 环境变量

在 `src/utils/index.ts` 中配置以下地址（或通过 `.env` 注入）：

```ts
export const WS_URL = 'wss://your-backend.com/ws/transcribe'
export const API_BASE = 'https://your-backend.com/api'
```

## 项目结构

```
classnote-ai/
├── src/
│   ├── pages/          # 页面组件
│   ├── stores/         # Pinia stores
│   ├── utils/
│   │   ├── wsManager.ts   # WebSocket 管理器（断线重连）
│   │   └── index.ts       # API 配置
│   ├── types/          # TypeScript 类型定义
│   ├── locales/        # i18n 语言包
│   ├── styles/         # 全局样式变量
│   ├── static/         # 静态资源
│   ├── App.vue
│   ├── main.ts
│   ├── manifest.json   # uni-app 应用配置
│   ├── pages.json      # 页面路由配置
│   └── uni.scss        # 全局 scss
├── package.json
└── vite.config.ts
```

## Android 权限说明

| 权限 | 用途 |
|---|---|
| `RECORD_AUDIO` | 课堂录音 |
| `BLUETOOTH` / `BLUETOOTH_ADMIN` | 连接 Oleap 降噪耳机 |
| `ACCESS_FINE_LOCATION` | BLE 设备扫描（Android 要求） |
| `INTERNET` | 上传转写流 / AI 请求 |
| `ACCESS_NETWORK_STATE` | 断线检测与重连 |

## 品牌色

| 用途 | 颜色 |
|---|---|
| 主色 | `#4F46E5`（Indigo） |
| 背景 | `#F3F4F6` |
| 文字 | `#111827` / `#6B7280` |
| 强调 | `#10B981`（Green） |

## MVP 限制与后续计划

- [ ] BLE 耳机接入（已预留接口，MVP 使用手机麦克风）
- [ ] 后端 Deepgram / GPT-4o 联调（URL 已配置，需替换真实服务）
- [ ] 云同步与多设备支持
- [ ] iOS 打包与 App Store 上架

---

© 2026 ClassNote AI — MIT License
