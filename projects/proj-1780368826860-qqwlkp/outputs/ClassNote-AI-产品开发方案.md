# ClassNote AI — 产品开发方案

> 基于 Oleap 降噪耳机技术，面向海外学生的课堂 AI 笔记 SaaS App
> 三人协同开发 · 四天 MVP · 更新日期：2026-06-02

---

## 目录

1. [产品定位](#一产品定位)
2. [技术选型](#二技术选型)
3. [核心功能模块设计](#三核心功能模块设计)
4. [数据库设计](#四数据库er设计)
5. [后端 API 设计](#五后端api设计)
6. [前端页面框架（20页）](#六前端页面框架20页)
7. [四天 MVP 开发清单](#七四天mvp开发清单)
8. [三人协同分工](#八三人协同分工)
9. [完整路线图（16周）](#九完整路线图16周)
10. [关键风险与应对](#十关键风险与应对)

---

## 一、产品定位

基于 Oleap 降噪耳机的 BLE 录音 + OPUS 解码 + 实时 PCM 流能力，构建面向海外学生的课堂笔记 SaaS App：**ClassNote AI**（ClearNote 智课堂笔记）。

**核心价值主张**：把每一堂课，变成你的专属笔记。

- 实时录音 + 流式语音转写
- 时间轴标记（不懂的知识点打标，AI 课后重点解析）
- 根据学生信息档案做个性化课堂总结
- 错题/笔记拍照上传知识库，支持追溯查看

---

## 二、技术选型

### 前端

| 模块 | 选型 | 理由 |
|------|------|------|
| 框架 | uni-app (Vue 3) | 原项目技术栈，iOS/Android 同时覆盖 |
| BLE 录音 | oleap-ble-sdk（继承原 UTS 插件） | 直接复用原 SDK，实时 PCM 流已验证 |
| 实时转写 UI | WebSocket + 滚动字幕 | 配合后端 ASR 流式推送 |
| 时间轴 | Canvas 自绘时间轴组件 | 需新建，参考原 audio-waveform.vue 架构 |
| 图片上传 | uni.chooseImage + uni.uploadFile | 错题/笔记拍照上传 |
| 本地存储 | uni.setStorageSync | 学生 Profile 缓存 |

### 后端

| 模块 | 选型 | 理由 |
|------|------|------|
| 框架 | Fastify (Node.js) | 原项目继承，性能好 |
| 实时通信 | @fastify/websocket | 流式 ASR 结果推送 |
| ASR | Deepgram Nova-2 | 海外市场英语优先，支持流式 + 多语言 |
| AI 摘要 | OpenAI GPT-4o | 课堂总结 + 个性化笔记生成 |
| 数据库 | PostgreSQL + Prisma ORM | 结构化数据（用户、课堂、时间轴） |
| 文件存储 | Cloudflare R2 | 音频文件、图片、PDF，免费额度够用 |
| 缓存 | Redis | WebSocket 会话、ASR 流状态 |
| 认证 | JWT + Refresh Token | 学生账号体系 |
| 部署 | Docker Compose → Railway/Render | 海外低成本首发 |

---

## 三、核心功能模块设计

### 模块 1：实时流式语音转写

技术路径（关键改造点）：

原项目 `onPcmCallback` 已实现实时 PCM 流推送，改造路径：

```
耳机 → BLE → onPcmCallback(PCM帧)
  → 客户端 WebSocket 发送 PCM 帧
    → 后端接收 → Deepgram Streaming API
      → 实时 transcript 片段
        → WebSocket 推回客户端
          → 滚动字幕 UI 渲染
```

Deepgram 支持直接发送 PCM/WAV 流，采样率 16kHz 与 Oleap 输出格式兼容。

MVP 阶段：改用 `uni.getRecorderManager()` 手机麦克风，录音逻辑相同，不依赖耳机。

---

### 模块 2：时间轴标记系统

每条标记数据结构：

```json
{
  "sessionId": "uuid",
  "timestampMs": 183400,
  "transcriptOffset": 420,
  "label": "didn't understand",
  "note": "用户可选填文字备注",
  "aiFollowUp": true
}
```

AI 总结时行为：
- 提取所有 `aiFollowUp: true` 的标记点
- 截取该时间戳前后 ±30s 的转写文本
- 在 Prompt 中指示 GPT-4o 对这些段落**重点展开**、延伸解释

---

### 模块 3：学生信息档案 + 个性化总结

Profile 字段设计：

```json
{
  "userId": "uuid",
  "grade": "10th Grade",
  "subject_focus": ["Physics", "Math"],
  "learning_style": "visual",
  "native_language": "Chinese",
  "proficiency_level": "intermediate",
  "weak_topics": ["Thermodynamics", "Calculus"],
  "preferred_summary_length": "medium"
}
```

个性化 Prompt 模板（核心竞争力）：

```
You are a study assistant for a 10th-grade student whose native language is Chinese
and English proficiency is intermediate. They struggle with Thermodynamics.

Generate a personalized class summary that:
1. Explains technical terms in simpler English
2. Adds Chinese annotations for key concepts
3. Expands Section 3 (marked as "didn't understand") with analogies
4. Highlights connections to their weak topic: Thermodynamics
...
```

MVP 阶段：使用固定 Prompt，不做个性化。

---

### 模块 4：知识库系统

| 内容类型 | 来源 | 存储 |
|----------|------|------|
| 课堂录音 | BLE/麦克风录制 | R2 + 元数据 DB |
| 实时转写文本 | ASR 结果 | PostgreSQL |
| AI 笔记总结 | GPT-4o 生成 | PostgreSQL |
| 错题/试卷照片 | 相机上传 | R2 + OCR 文本 |
| 手写笔记照片 | 相机上传 | R2 + OCR 文本 |
| 时间轴标记 | 用户操作 | PostgreSQL |

检索：PostgreSQL 全文搜索（初期）→ 后期引入向量搜索（pgvector）

---

## 四、数据库 ER 设计

```
USERS
  id (uuid, PK)
  email
  name
  profile (json)      ← 学生档案
  created_at

SESSIONS             ← 每节课
  id (uuid, PK)
  user_id (FK)
  subject
  title
  duration_ms
  audio_url
  status             ← recording / summarizing / done
  started_at

TRANSCRIPTS
  id (uuid, PK)
  session_id (FK)
  full_text
  segments (json)    ← [{start, end, text}]
  language

MARKERS              ← 时间轴标记
  id (uuid, PK)
  session_id (FK)
  timestamp_ms
  label              ← didn't_understand / important / exam_tip
  note
  ai_follow_up (bool)

SUMMARIES            ← AI 课堂总结
  id (uuid, PK)
  session_id (FK)
  content
  key_points (json)
  follow_up_sections (json)  ← 标记处的重点展开

MATERIALS            ← 错题/笔记/文件
  id (uuid, PK)
  user_id (FK)
  type               ← wrong_answer / handwritten_note / syllabus
  file_url
  ocr_text
  subject
  uploaded_at
```

---

## 五、后端 API 设计

```
认证
  POST /auth/register
  POST /auth/login
  POST /auth/refresh

课堂会话
  POST   /api/sessions              新建课堂
  PATCH  /api/sessions/:id/end      结束课堂（触发 AI 总结）
  GET    /api/sessions              历史课堂列表
  GET    /api/sessions/:id          获取会话完整详情

WebSocket
  WS /ws/session/:id/audio          接收 PCM 帧 → ASR → 推回转写结果

时间轴标记
  POST /api/sessions/:id/markers    添加标记
  GET  /api/sessions/:id/markers    获取所有标记

AI 总结
  POST /api/sessions/:id/summarize  手动触发（也支持自动）
  GET  /api/sessions/:id/summary    获取摘要

材料上传（知识库）
  POST /api/materials/upload        上传图片（错题/笔记）
  GET  /api/materials               知识库列表

学生档案
  GET  /api/profile
  PUT  /api/profile

知识库搜索
  GET  /api/search?q=...
```

---

## 六、前端页面框架（20页）

共 **20 个页面**，设计稿已整理至 `qpp前端页面框架/` 目录，按用户流程顺序命名（01–20）。

### 用户完整使用路径

```
注册/登录（01→02→03）
    │
    ▼
我的课程（05）
    ├── 添加课程（06）→ 上传大纲（08）
    ├── 编辑课程（07）
    └── 已归档（09）
    │
    ▼
开始上课
    ├── 权限申请（10）[首次]
    ├── 准备录音（11）
    ├── 实时转写（12）← 核心页面
    ├── 时间轴标记（13）
    ├── 标记详情（14）
    └── AI课堂总结（15）
    │
    ▼
课后学习
    ├── 拍照上传错题（16）→ 错题解析（17）
    ├── 知识库（18）→ 知识点详情（19）
    └── 复习中心（20）
```

### 认证流程（01–04）

| 序号 | 文件名 | 页面名称 | 核心内容 |
|------|--------|----------|----------|
| 01 | `01-欢迎登录页.png` | 欢迎 / 登录页 | App 首屏，支持 Google / Apple / 邮箱 / 学校账号四种登录方式 |
| 02 | `02-注册页.png` | 注册页 | 邮箱 + 密码注册，选择身份（学生 / 教师 / 其他），填写国家和学校 |
| 03 | `03-验证学生邮箱页.png` | 验证学生邮箱页 | 输入 .edu 学校邮箱，发送验证码解锁学生专属权益 |
| 04 | `04-忘记密码页.png` | 忘记密码页 | 输入注册邮箱，发送密码重置链接 |

### 课程管理（05–09）

| 序号 | 文件名 | 页面名称 | 核心内容 |
|------|--------|----------|----------|
| 05 | `05-我的课程页.png` | 我的课程（首页） | 课程卡片列表，显示每门课已上课次、AI 笔记数、待复习知识点；顶部搜索 + 筛选 |
| 06 | `06-添加新课程页.png` | 添加新课程页 | 填写课程名称、学科类别、授课教师、学期、上课时间、教室/网课链接；选颜色；可选上传课程大纲 |
| 07 | `07-编辑课程页.png` | 编辑课程页 | 修改课程信息，含归档课程 / 删除课程操作入口 |
| 08 | `08-上传课程大纲页.png` | 上传课程大纲页 | 拖拽上传 PDF / JPG / PNG / DOCX（≤25MB），AI 自动识别章节安排、考试时间、重点主题 |
| 09 | `09-已归档课程页.png` | 已归档课程页 | 展示历史归档课程（按学期），支持查看详情或恢复 |

### 课堂录音核心流程（10–15）

| 序号 | 文件名 | 页面名称 | 核心内容 |
|------|--------|----------|----------|
| 10 | `10-麦克风权限页.png` | 麦克风权限申请页 | 首次录音前弹出，说明权限用途，提供允许 / 暂不允许选项 |
| 11 | `11-准备录音页.png` | 准备开始录音页 | 显示耳机连接状态 + 电量，确认课程信息，选择录音模式（降噪 / 专业），选课堂语言，点击开始 |
| 12 | `12-实时录音转写页.png` | 实时录音转写页 | 核心录音界面：顶部计时、实时滚动字幕（带时间戳）、底部时间轴、快速笔记 / 暂停&结束按钮 |
| 13 | `13-时间轴标记页.png` | 时间轴标记页 | 课堂结束后查看完整时间轴，标记分类（疑问 / 重点 / 考试提示），可点击回放对应片段 |
| 14 | `14-标记详情页.png` | 标记详情页 | 展示单条标记的原始录音片段（可播放）、转写内容、用户备注、AI 解释、相关知识点标签 |
| 15 | `15-AI课堂总结页.png` | AI 课堂总结页 | 课堂 AI 笔记：课堂概览 + 核心知识点 + 你标记的疑问重点展开解释 + 个性化学习建议 + 练习题 |

### 错题管理（16–17）

| 序号 | 文件名 | 页面名称 | 核心内容 |
|------|--------|----------|----------|
| 16 | `16-拍照上传错题页.png` | 拍照上传错题页 | 相机扫描界面，支持错题 / 手写笔记 / 试卷 / 日报 / 课本分类，支持从相册导入和多页扫描 |
| 17 | `17-错题解析页.png` | 错题解析页 | 显示题目原题、我的作答、正确答案、错误原因分析、错误知识点标签，底部关联知识点 / 生成练习 |

### 知识库（18–19）

| 序号 | 文件名 | 页面名称 | 核心内容 |
|------|--------|----------|----------|
| 18 | `18-知识库页.png` | 知识库页 | 汇总所有学习素材（课堂录音 / AI 笔记 / 错题本 / 个人笔记 / 文件资料 / 知识地图），顶部全局搜索，底部最近学习和热门知识点 |
| 19 | `19-知识点详情页.png` | 知识点详情页 | 单个知识点聚合视图：简明解释、来自哪些课堂、相关错题、我的笔记、AI 练习入口 |

### 复习中心（20）

| 序号 | 文件名 | 页面名称 | 核心内容 |
|------|--------|----------|----------|
| 20 | `20-复习中心页.png` | 复习中心页 | 今日复习计划（疑问标记 / 错题 / 闪卡 / 测验），疑问重点复习、错题重练、闪卡记忆三大模块，学习进度统计 |

> 设计稿文件路径：`qpp前端页面框架/01-欢迎登录页.png` ～ `20-复习中心页.png`
> 忘记密码页（04）属于认证辅助流程，从登录页入口进入。

---

## 七、四天 MVP 开发清单

**MVP 闭环定义**：录音 → 实时字幕 → 打标记 → AI 生成课堂笔记 → 查看历史记录

**四天内砍掉的功能**：BLE 耳机（改用手机麦克风）、学生 Profile 个性化、图片上传/OCR、向量搜索、完整账号体系（hardcode userId）

---

### Day 1 — 基础设施 + 录音上传

| # | 任务 | 负责 | 验收标准 |
|---|------|------|---------|
| 1 | Fastify 项目初始化：CORS、multipart、WebSocket 插件、健康检查 | B | `GET /health` 返回 200 |
| 2 | PostgreSQL + Prisma 建表：`sessions`、`transcripts`、`markers`、`summaries` | B | `prisma migrate dev` 成功 |
| 3 | S3/R2 存储桶 + 音频文件上传接口 `POST /api/sessions` + `POST /api/sessions/:id/audio` | B | Postman 上传 WAV 文件成功 |
| 4 | uni-app 新建项目，配置路由：首页、课堂页、历史页 | A | 三个页面可跳转 |
| 5 | 首页 UI：「开始新课堂」按钮 + 科目/标题输入（参考 05-我的课程页.png） | A | 点击创建 session，拿到 sessionId |
| 6 | Docker Compose 本地跑通（PostgreSQL + Redis + Fastify） | C | `docker compose up` 全绿 |
| 7 | 部署到 Railway/Render，配置环境变量 | C | 远端 `/health` 可访问 |

---

### Day 2 — 实时转写核心管道

| # | 任务 | 负责 | 验收标准 |
|---|------|------|---------|
| 8 | 后端 WebSocket 路由 `WS /ws/session/:id/audio`，接收二进制音频帧 | B | wscat 连接成功 |
| 9 | 接入 Deepgram Streaming API，将收到的 PCM 帧转发，接收 transcript 片段后推回客户端 | C | 说话 → 后端日志出现文字 |
| 10 | WebSocket 推回格式：`{ type: "transcript", text, isFinal, timestampMs }` | C | 格式固定，前端可解析 |
| 11 | 课堂页：调用 `uni.getRecorderManager()` 录音，逐帧通过 WebSocket 发送 | A | 手机麦克风录音帧发出 |
| 12 | 课堂页：接收 WebSocket 推回的字幕，append 到滚动文本区域（参考 12-实时录音转写页.png） | A | 说话 → 手机屏幕出现实时字幕 |
| 13 | 转写结果持久化：isFinal 片段存入 `transcripts.segments` | B | DB 中有分段记录 |

**Day 2 里程碑**：拿手机说话，屏幕上实时出字。

---

### Day 3 — 时间轴标记 + AI 课堂总结

| # | 任务 | 负责 | 验收标准 |
|---|------|------|---------|
| 14 | 课堂页底部加「标记」按钮，点击记录当前 `timestampMs` + 标签（没听懂/重要/疑问）（参考 12-实时录音转写页.png） | A | 按钮点击有视觉反馈 |
| 15 | `POST /api/sessions/:id/markers` 存标记，返回 markerId | B | DB 中 markers 表有记录 |
| 16 | 课堂页时间轴：简单横条 + 彩色圆点标记位置（参考 13-时间轴标记页.png） | A | 打完标记后时间轴上可见圆点 |
| 17 | `PATCH /api/sessions/:id/end` 结束课堂，触发异步 AI 总结任务 | B | 接口返回 `{ status: "summarizing" }` |
| 18 | AI 总结 Service：取 transcript 全文 + markers 对应片段，构造 Prompt，调 GPT-4o | C | 本地 node 脚本跑出摘要文本 |
| 19 | Prompt 模板：全文摘要 + 关键词 + 标记片段重点展开（固定模板，不做个性化） | C | 输出包含标记处的延伸解释 |
| 20 | 总结结果存入 `summaries` 表，`sessions.status` 改为 `done` | B | DB 可查到 summary 记录 |
| 21 | 课堂页「结束课堂」后跳转到总结页，展示摘要正文 + 关键词 + 标记重点区块（参考 15-AI课堂总结页.png） | A | 总结内容可读，标记处有高亮区块 |

**Day 3 里程碑**：上完一节课 → 打了标记 → 结束后看到 AI 生成的带重点解析的笔记。

---

### Day 4 — 历史知识库 + 联调打磨

| # | 任务 | 负责 | 验收标准 |
|---|------|------|---------|
| 22 | `GET /api/sessions` 返回历史课堂列表（标题、科目、时长、状态、时间） | B | 接口返回数组 |
| 23 | `GET /api/sessions/:id` 返回完整详情（transcript + markers + summary） | B | 单条数据结构完整 |
| 24 | 历史页：课堂卡片列表，显示科目/标题/日期/时长（参考 05-我的课程页.png） | A | 列表正常渲染 |
| 25 | 详情页：完整转写文本 + 时间轴标记列表 + AI 总结（三个 tab 或顺序排列）（参考 13、15页） | A | 历史课堂可完整回溯 |
| 26 | 音频文件 URL 回填，详情页支持播放原始录音 | A+B | 点击播放键可听到录音 |
| 27 | 全流程 E2E 联调：新建课堂 → 录音 → 打标记 → 结束 → 看总结 → 历史查看 | 全员 | 走完一遍无崩溃 |
| 28 | 错误兜底：WebSocket 断线重连、ASR 超时提示、总结失败提示 | A+B | 异常场景有提示不白屏 |
| 29 | 内测包打包（Android APK），发给种子用户 | C | APK 可安装运行 |

**Day 4 里程碑**：完整闭环可演示，可交给真实学生试用。

---

## 八、三人协同分工

### 角色职责

| 角色 | 职责范围 |
|------|---------|
| **A（前端）** | uni-app 全部页面、WebSocket 字幕组件、时间轴 Canvas 组件、图片上传、知识库 UI |
| **B（后端）** | Fastify API 全部路由、PostgreSQL + Prisma、R2 存储、JWT 认证、WebSocket 服务 |
| **C（AI/基础设施）** | Deepgram ASR 接入 + 流式管道、GPT-4o Prompt 工程、OCR、Docker 部署 + CI/CD、数据库设计 |

> A 和 B 并行，C 承担跨端胶水工作，三人共同参与 Code Review。

### 四天每日并行节奏

```
        A（前端）              B（后端）              C（AI/基础设施）
Day1    页面路由+首页UI         DB建表+文件上传         Docker+部署
Day2    录音+WS发帧+字幕        WS接口+数据持久化       Deepgram流式接入
Day3    标记UI+总结页           标记/结束接口           GPT-4o Prompt+总结Service
Day4    历史页+详情页           列表/详情接口           E2E联调+打包
```

### 技术决策速查

| 问题 | 决策 |
|------|------|
| 录音方案 | `uni.getRecorderManager()` 手机麦克风，format: PCM，sampleRate: 16000 |
| ASR | Deepgram Nova-2，Streaming 模式，语言 en-US |
| AI 总结 | GPT-4o，batch 调用，结束课堂后异步触发 |
| 数据库 | PostgreSQL（Railway 托管） |
| 文件存储 | Cloudflare R2（免费额度够用） |
| 认证 | 暂时 hardcode `userId = "demo-user"`，不做登录 |

---

## 九、完整路线图（16周）

```
Week 1-2   [全员] 架构搭建、DB 建表、项目脚手架、BLE SDK 验证
Week 3-5   [A+B+C] 核心录音 + WebSocket ASR 流式转写（MVP 核心）
Week 6-7   [A+C] 时间轴标记 UI + 后端存储 + AI 总结 Prompt 调优
Week 8-9   [A+B] 学生 Profile 设置 + 个性化摘要生成
Week 10-12 [A+B+C] 知识库（图片上传 + OCR + 全文搜索 + 列表页）
Week 13-14 [全员] 音频回放 + 字幕对齐 + 时间轴回溯
Week 15-16 [全员] Beta 测试、Bug 修复、App Store 上架准备
```

---

## 十、关键风险与应对

| 风险 | 应对 |
|------|------|
| Deepgram 延迟 / 价格 | 同时接入 AssemblyAI 作备选；初期用 Whisper batch 模式降成本 |
| iOS 实时 PCM 流未实现 | 原 SDK iOS 端 realtime 未完成，Phase 1 先做 Android，iOS 用 batch 模式补录 |
| GPT-4o 个性化成本 | 每次总结约 2000-4000 tokens，控制在 $0.01-0.05/次；设置每日用量上限 |
| 海外 App Store 审核 | 录音权限、隐私政策需符合 GDPR + CCPA，提前准备 |
| BLE 连接稳定性 | 继承原 SDK 的错误恢复机制（recoverable error 自动重试） |
