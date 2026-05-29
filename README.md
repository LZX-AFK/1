# 轨交驾驶室声学安全终端 — Oleap Rail

基于黄鹂智声 AI 灭噪耳机的轨道交通驾驶室声学安全解决方案。本项目为团队协作 MVP 开发仓库。

## 项目结构

```
oleap-rail/
├── oleap-uniapp-demo/     # 车载端 UniApp 应用（耳机连接 + 录音 UI，基于 SDK 源码）
├── oleap-fastify-demo/    # 后端服务（Fastify Node.js）
│   └── src/routes/        # 三人各负责一个路由模块
│       ├── callout.js     # ① 口呼监控（录音 + 漏呼检测）
│       ├── transcribe.js  # ② 实时转写（ASR + 关键词搜索）
│       └── playback.js    # ③ 回放管理（检索 + 播放 + 时间轴）
├── docs/                  # 项目文档
│   └── 轨交驾驶室声学终端_团队协作方案.md
└── README.md
```

## 三条核心功能链路

| 链路 | 功能 | 负责人 |
|:---|:---|:---|
| ① 口呼监控 | 自动录音 → 口呼类型匹配 → 漏呼告警 → 合规统计 | Person A |
| ② 实时转写 | ASR 引擎转写 → 结果存储 → 全文搜索 | Person B |
| ③ 回放管理 | 时间/司机/线路检索 → 在线播放 → 时间轴聚合 | Person C |

## 快速开始

```bash
# 安装依赖
cd oleap-fastify-demo && npm install

# 启动后端
npm run dev
```

## 技术栈

- **前端**: UniApp（Vue 3）+ 黄鹂智声 OEM SDK
- **后端**: Fastify (Node.js) + TypeScript
- **ASR**: 阿里云语音识别
- **存储**: JSON 文件存储（MVP）/ PostgreSQL（生产）

## 协作规范

- 每人独立功能分支：`feat/callout`、`feat/transcribe`、`feat/playback`
- 共享类型定义统一维护在 `src/types/`
- 迁移脚本时间戳命名，只增不改
- 合并前必须 Code Review
