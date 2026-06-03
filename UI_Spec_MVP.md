# Newmax App — UI Spec v3（最终版）

> **生成日期**: 2026-06-02  
> **技术栈**: uni-app + Vue3 + TypeScript + UnoCSS + uView Pro + vue-i18n  
> **用途**: Claude 看图 → 产出本 Spec → DeepSeek 按此生成代码  
> **v3 更新**: ①补全所有页面完整布局（不再 "与 v1 相同，略"）②midButton 兼容说明 ③录音状态管理策略 ④KnowledgeBase 6入口补齐 ⑤前端开发约束声明

---

## 开发约束（交给 AI 生成代码时必须遵守）

```
1. 当前阶段只实现静态前端 + 本地 mock 数据，不接真实后端。
2. 所有页面必须基于本 Spec，不得新增无关页面。
3. 优先完成 P0 页面闭环，不实现真实录音、真实转写、真实 AI，
   只用 mock 流式文本模拟。
4. 录音流程必须可点击跑通：
   RecordPrepare → LiveTranscript → ProcessingOverlay → AISummary
5. 所有数据统一放在 Pinia store 中，便于后续替换真实 API。
6. 页面必须适配 750rpx，使用 UnoCSS + uView Pro。
7. 所有共享组件必须独立封装，不允许在页面里重复写卡片样式。
8. 所有文本使用 $t() 国际化，中英双语 key 统一放在 locales/ 下。
9. 每页面必须处理 loading / normal / empty / error 四种状态。
```

---

## 全局设计规范

### 单位与尺寸
| 属性 | 值 | 说明 |
|------|---|------|
| 设计基准宽度 | 750rpx | uni-app 标准 |
| 最小点击区域 | 88rpx × 88rpx (44×44px) | 移动端触控规范 |
| 安全区顶部 | `var(--status-bar-height)` | 适配刘海屏 |
| 安全区底部 | `env(safe-area-inset-bottom)` | 适配底部指示条 |
| 页面左右边距 | 32rpx (16px) | 全局统一 |
| 卡片圆角 | 24rpx (12px) | 统一圆角 |
| 卡片间距 | 24rpx (12px) | 纵向间距 |

### 颜色系统
```scss
$primary:         #4F46E5;  // 主按钮、强调元素
$primary-light:   #EEF2FF;  // 浅色背景
$primary-dark:    #3730A3;  // 按下态
$success:         #10B981;  // 连接成功、完成
$warning:         #F59E0B;  // 待复习、需要注意
$error:           #EF4444;  // 错误、断开连接
$info:            #3B82F6;  // 信息提示
$text-primary:    #1F2937;  // 主文字
$text-secondary:  #6B7280;  // 次要文字
$text-tertiary:   #9CA3AF;  // 辅助文字
$border:          #E5E7EB;  // 分割线/边框
$bg-page:         #F3F4F6;  // 页面背景
$bg-card:         #FFFFFF;  // 卡片背景
$bg-input:        #F9FAFB;  // 输入框背景
$accent:          #8B5CF6;  // "个性化解释"区块强调色
$accent-light:    #F5F3FF;  // 个性化区块浅色背景
```

### 字体规范
| 层级 | 字号 (rpx) | 字重 | 用途 |
|------|-----------|------|------|
| H1 | 40rpx (20px) | 700 | 页面标题 |
| H2 | 32rpx (16px) | 600 | 卡片标题、区块标题 |
| H3 | 28rpx (14px) | 600 | 列表标题 |
| Body | 28rpx (14px) | 400 | 正文、描述 |
| Caption | 24rpx (12px) | 400 | 辅助信息、时间 |
| Small | 20rpx (10px) | 400 | 标签、徽标 |

### 间距层级
| 层级 | rpx | 用途 |
|------|-----|------|
| xs | 8rpx | 图标与文字间距 |
| sm | 16rpx | 同组元素间距 |
| md | 24rpx | 卡片内边距、组件间距 |
| lg | 32rpx | 页面边距、区块间距 |
| xl | 48rpx | 大区块间距 |

---

## 共享组件清单（必须独立封装）

### 1. DeviceStatusBar
**用途**: 首页 + 录音准备 + 实时转写 + Profile页  
**Props**: `connected: boolean`, `battery: number`, `mode: string`, `compact?: boolean`  
**布局**:
```
[图标] [状态文字]  [电量 86%] [降噪模式标签]
```
- connected: 绿色图标
- disconnected: 灰色图标 + 点击连接提示
- compact模式（首页顶部）: 仅图标+电量，高度40rpx

### 2. CourseCard
**Props**: `course: Course`, `variant: 'full' | 'compact' | 'summary'`  
**full**（课程列表）:
```
┌─────────────────────────────────────┐
│ 📚 Biology 101                  →   │  ← H3 + 箭头
│ Prof. Smith                        │  ← Caption
│ Mon/Wed 10:00                      │  ← Caption
│ ───────────────────────────────── │
│ 📊 8 recordings · 21 notes · 6⏳  │  ← 统计行
└─────────────────────────────────────┘
  padding: 24rpx
```
**compact**（首页）:
```
┌─────────────────────────────────────┐
│ 🟢 Biology 101                      │
│ 52 min · 4 marks · Ready           │
└─────────────────────────────────────┘
```

### 3. NoteCard
**Props**: `note: AINote`, `showCourseName?: boolean`  
**布局**:
```
┌─────────────────────────────────────┐
│ Biology 101 · Cell Division    →    │  ← showCourseName时
│ 📝 正文摘要，最多3行省略               │
│ 🏷️ mitosis  🏷️ chromosome          │  ← 知识点标签
└─────────────────────────────────────┘
  高度约 180rpx
```

### 4. RecordingCard
**Props**: `recording: Recording`  
**布局**:
```
┌─────────────────────────────────────┐
│ 🎙️ Biology 101                      │
│ May 28, 2026 · 52 min              │
│ 4 marks · Accuracy 95%             │
│ [▶ Play] [📄 Transcript] [📝 →]   │
└─────────────────────────────────────┘
  高度约 160rpx
```

### 5. TimelineMark
**Props**: `mark: TimelineMark`, `showActions?: boolean`  
**布局**:
```
┌─────────────────────────────────────┐
│ ● 00:08:45                         │
│   🟡 Confusing                     │
│   "...原文截取，最多2行..."           │
│   [AI Explain] [▶ Play] [📌 →]    │  ← showActions时
└─────────────────────────────────────┘
```

### 6. MistakeCard
**Props**: `mistake: Mistake`, `compact?: boolean`  
**布局**:
```
┌─────────────────────────────────────┐
│ 🖼️[缩略图]  Biology Quiz #3         │  ← 缩略图96rpx
│              🏷️ cell division       │
│              🟡 Not mastered        │
└─────────────────────────────────────┘
  高度约 120rpx
```

### 7. AISummarySection
**Props**: `title: string`, `icon: string`, `collapsible?: boolean`, `highlighted?: boolean`  
**highlighted 模式**: 左边框 6rpx `$accent`，背景 `$accent-light`  
**布局**:
```
┌─────────────────────────────────────┐
│ 📋 标题文字                    ▼    │  ← 可折叠标题栏
│ ───────────────────────────────── │
│ [子内容插槽]                        │
└─────────────────────────────────────┘
```

### 8. EmptyState
**Props**: `icon: string`, `title: string`, `description?: string`, `actionText?: string`  
**布局**: 居中，图标(160rpx) + 标题 + 描述 + 可选CTA按钮

### 9. SearchBar
**Props**: `placeholder: string`, `value: string`, `showFilter?: boolean`  
**布局**: 圆角输入框(高度80rpx)，左侧搜索图标，右侧可选筛选按钮

---

## MVP 页面清单（8页 + 2嵌入式视图）

| # | 页面/视图 | 类型 | 路由 | 优先级 |
|---|----------|------|------|--------|
| 1 | 首页 Home | 独立页面 | `/pages/home/index` | P0 |
| 2 | 课程列表 Courses | 独立页面 | `/pages/courses/index` | P0 |
| 3 | 课程详情 CourseDetail | 独立页面 | `/pages/courses/detail` | P0 |
| 4 | 录音准备 RecordPrepare | 独立页面 | `/pages/record/prepare` | P0 |
| 5 | 实时转写 LiveTranscript | 独立页面 | `/pages/record/live` | P0 |
| 6 | AI 总结 AISummary | 独立页面 | `/pages/record/summary` | P0 |
| 7 | 知识库首页 KnowledgeBase | 独立页面 | `/pages/knowledge/index` | P0 |
| 8 | 我的/学生档案 Profile | 独立页面 | `/pages/profile/index` | P0 |
| — | 时间轴 BottomSheet | 嵌入式视图 | (嵌入页面5) | P0 |
| — | 处理中 ProcessingOverlay | 嵌入式视图 | (页面5→6过渡) | P0 |

---

## 底部 Tab 配置

```
Home  |  Courses  |  Record  |  Knowledge  |  Profile
🏠       📚          🎙️         📁            👤
```

| Tab | 文字 Key | 图标 | 路由 |
|-----|---------|------|------|
| 首页 | `tab.home` | home | /pages/home/index |
| 课程 | `tab.courses` | book | /pages/courses/index |
| 录音 | `tab.record` | mic（突出圆形按钮） | /pages/record/prepare |
| 知识库 | `tab.knowledge` | folder | /pages/knowledge/index |
| 我的 | `tab.profile` | user | /pages/profile/index |

**Record Tab 中间凸起按钮的实现策略**:
- 优先尝试 uni-app 原生 `midButton` 配置
- 如目标平台（微信小程序/Android/iOS）`midButton` 兼容性不足，则使用**自定义 TabBar** 实现中间凸起录音按钮
- 自定义 TabBar 方案：在 `pages.json` 中 `tabBar.custom: true`，编写独立的 `custom-tab-bar` 组件
- 圆形按钮规格：直径 112rpx，主色填充 + 白色图标，高出 Tab 栏 20rpx
- 点击跳转录音准备页（不是直接开始录音）

---

---

## 页面 1：首页 HomeScreen

### 路由
`/pages/home/index`

### 布局结构（完整）

```
┌──────────────────────────────────────────┐
│  [SafeArea]                              │  ← 动态高度
│  ─────────────────────────────────────── │
│  上午好, Alex          🎧 Connected · 86% │  ← 顶部栏 96rpx
│  ─────────────────────────────────────── │
│                                          │
│  ┌────────────────────────────────────┐  │
│  │         🎙️ Start Recording         │  │  ← 录音大按钮
│  │       Classroom Mode               │  │     高度 160rpx 圆角 24rpx
│  └────────────────────────────────────┘  │     主色背景+白色文字
│                                          │
│  ┌─ 今日课程 ─────────────────────────┐  │
│  │  📚 Biology 101    10:00  Today    │  │  ← CourseCard(summary)
│  │     Mon/Wed · Prof. Smith          │  │     高度 120rpx
│  └────────────────────────────────────┘  │
│                                          │
│  ┌─ 最近课堂笔记 ─────────────────────┐  │
│  │  NoteCard × 3                       │  │
│  └────────────────────────────────────┘  │
│                                          │
│  ┌─ AI 学习提醒 ──────────────────────┐  │
│  │  💡 你在最近3节Biology课中           │  │  背景 $primary-light
│  │     多次标记了 Genetic Expression    │  │  圆角 16rpx
│  │     建议今天复习 12 分钟     [→]    │  │
│  └────────────────────────────────────┘  │
└──────────────────────────────────────────┘
```

### 状态表

| 状态 | 表现 |
|------|------|
| Loading | 骨架屏：顶部栏占位 + 按钮骨架 + 3个卡片骨架（灰色闪烁动画） |
| Normal | 完整渲染 |
| Empty（无课程） | 不显示今日课程区，录音按钮下方显示 EmptyState("添加你的第一门课") |
| Empty（无笔记） | 最近笔记区显示 EmptyState("还没有课堂笔记", "开始你的第一堂课吧") |
| Error | 顶部提示条（高度 72rpx，$error 背景色），提供"重试"按钮 |
| 下拉刷新 | 刷新动画 → 重新请求 → 自动更新 |

### 交互逻辑

| 触发 | 行为 |
|------|------|
| 点击"Start Recording" | `uni.navigateTo` → `/pages/record/prepare` |
| 点击今日课程卡片 | `uni.navigateTo` → `/pages/courses/detail?id=xxx` |
| 点击最近笔记卡片 | `uni.navigateTo` → `/pages/record/summary?id=xxx` |
| 点击 AI 提醒"去复习" | `uni.switchTab` → 课程 Tab，自动定位复习页 |
| 点击设备状态 | `uni.switchTab` → Profile |
| 点击右上角头像 | `uni.switchTab` → Profile |
| 下拉页面 | 触发 refresherrefresh 事件 |

---

## 页面 2：课程列表 CourseListScreen

### 路由
`/pages/courses/index`

### 布局结构（完整）

```
┌──────────────────────────────────────────┐
│  [SafeArea]                              │
│  ─────────────────────────────────────── │
│  ← 我的课程              ＋ Add Course    │  ← NavBar 96rpx
│  ─────────────────────────────────────── │
│  [ScrollView 可滚动]                      │
│                                          │
│  ┌─ 当前学期 Spring 2026 ───────────────┐ │
│  │                                       │ │
│  │  CourseCard(full) × N                  │ │  ← 间距24rpx
│  │                                       │ │     左右padding 32rpx
│  │  ┌──────────────────────────────┐     │ │
│  │  │ 📚 Biology 101          →    │     │ │  ← full模式
│  │  │ Prof. Smith                   │     │ │
│  │  │ Mon/Wed 10:00                │     │ │
│  │  │ ────────────────────────     │     │ │
│  │  │ 📊 8 recordings · 21 notes   │     │ │
│  │  │ 🔴 6 unresolved marks        │     │ │
│  │  └──────────────────────────────┘     │ │
│  │                                       │ │
│  │  CourseCard(full) × 2...              │ │
│  │                                       │ │
│  └───────────────────────────────────────┘ │
│                                          │
│  ┌─ 待复习 ────────────────────────────┐  │
│  │  🟡 Biology · 6 marks pending  [→]  │  │  ← 紧凑卡片 80rpx
│  │  🔴 Economics · 2 questions    [→]  │  │     背景 $warning-light
│  └──────────────────────────────────────┘  │
│                                          │
└──────────────────────────────────────────┘
```

### 添加课程表单（点击"+"弹出的 BottomSheet）

```
┌──────────────────────────────────────────┐
│  Add New Course              ✕           │  ← 标题 + 关闭
│  ─────────────────────────────────────── │
│  Course Name:    [                  ]    │  ← u-input
│  Teacher:        [                  ]    │
│  Schedule:       [Mon/Wed     ] [10:00] │
│  Semester:       [2026 Spring ▼      ]  │  ← u-select
│  ─────────────────────────────────────── │
│  [Cancel]              [Save Course]     │  ← 主色按钮
└──────────────────────────────────────────┘
```

### 状态表

| 状态 | 表现 |
|------|------|
| Loading | 3个 CourseCard 骨架屏（灰色占位块） |
| Normal | 课程卡片列表 |
| Empty | EmptyState("还没有添加课程", "添加课程开始学习", action: "添加课程") |
| Error | 顶部 Error 提示条 + 重试 |

### 交互

| 触发 | 行为 |
|------|------|
| 点击"+" | 弹出添加课程 BottomSheet |
| 点击 CourseCard | navigatoTo → 课程详情 |
| 长按 CourseCard | 弹出操作菜单（编辑/删除） |
| 点击待复习卡片 | navigatoTo → 课程详情，定位到 Review Tab |
| Save Course | 写入 useCourseStore → 关闭 BottomSheet → 列表刷新 |

---

## 页面 3：课程详情 CourseDetailScreen

### 路由
`/pages/courses/detail?id=xxx`

### 布局结构（完整）

```
┌──────────────────────────────────────────┐
│  [SafeArea]                              │
│  ─────────────────────────────────────── │
│  ← Biology 101                           │  ← NavBar 96rpx
│  ─────────────────────────────────────── │
│                                          │
│  ┌─ 课程信息头 ────────────────────────┐  │
│  │  Biology 101                          │  │  ← H1
│  │  Prof. Smith · Mon/Wed 10:00          │  │  ← Caption
│  │  Semester 2026 Spring · Week 5        │  │
│  │  ──────────────────────────────────  │  │
│  │  📊 8 recordings · 21 notes · 5 quiz │  │
│  └──────────────────────────────────────┘  │  高度约 200rpx
│                                          │
│  ┌─ Tab 栏 ────────────────────────────┐  │
│  │  Sessions │ Notes │ Mistakes │ Review │  │  ← u-tabs 88rpx
│  └──────────────────────────────────────┘  │     底部指示线 主色
│                                          │
│  [Tab 内容区，swiper 切换]                 │
│                                          │
│  ═══ Sessions Tab ════════════════════════  │
│  RecordingCard × N                        │
│  每个卡片高度约 160rpx，间距 24rpx          │
│  ┌──────────────────────────────┐        │
│  │ 🎙️ Biology 101 · May 28      │        │
│  │ 52 min · 4 marks · Accuracy 95%       │
│  │ [▶ Play] [📄 Transcript] [📝 →]      │
│  └──────────────────────────────┘        │
│  点击 RecordingCard → 跳转 AI 总结        │
│  ▶ Play → mock 播放（P0 阶段仅 UI）       │
│  📄 Transcript → 打开转写文本 Modal       │
│                                          │
│  ═══ Notes Tab ═══════════════════════════ │
│  NoteCard × N (showCourseName: false)     │
│  点击卡片 → 跳转 AI 总结                  │
│                                          │
│  ═══ Mistakes Tab ════════════════════════ │
│  MistakeCard × N                          │
│  P0 阶段：展示 mock 错题数据              │
│  Empty 时："还没有错题" + 拍照上传入口     │
│  点击卡片 → 跳转错题详情（P1）或 Toast    │
│                                          │
│  ═══ Review Tab ═══════════════════════════ │
│  复习计划卡片                              │
│  ┌──────────────────────────────┐        │
│  │ 📋 Today's Review Plan       │        │
│  │ ☐ Review Cell Division (10min)        │
│  │ ☐ 5 flashcards                       │
│  │ ☐ 2 marked moments                   │
│  │ 🟡 Weak: Genetic Expression          │
│  └──────────────────────────────┘        │
│                                          │
└──────────────────────────────────────────┘
```

### 组件清单

| 位置 | 组件 | 说明 |
|------|------|------|
| 课程信息头 | 自定义 | 高度 200rpx，课程名 H1 + 教师/Caption + 统计行 |
| Tab 栏 | uView `u-tabs` | 4个Tab，每Tab高亮条 4rpx，主色 |
| Tab 内容 | `<swiper>` | 每Tab独立 `<scroll-view>`，上拉加载更多 |

### 状态表（每个 Tab 独立）

| Tab | Loading | Empty | Normal | Error |
|-----|---------|-------|--------|-------|
| Sessions | 3个 RecordingCard 骨架 | EmptyState("还没有课堂记录") + 开始录音按钮 | 录音列表 | 顶部 Error 提示 |
| Notes | 3个 NoteCard 骨架 | EmptyState("还没有AI笔记") | 笔记列表 | 顶部 Error 提示 |
| Mistakes | 3个卡片骨架 | EmptyState("还没有错题") + 拍照入口 | 错题列表 | 顶部 Error 提示 |
| Review | 卡片骨架 | EmptyState("学习数据不足，多上几节课后生成") | 复习计划 | 顶部 Error 提示 |

### 交互

| 触发 | 行为 |
|------|------|
| 点击 Tab | swiper 切换到对应面板 |
| 点击 RecordingCard | navigatoTo → AI 总结页 |
| 点击 NoteCard | navigatoTo → AI 总结页 |
| 点击 MistakeCard | P0 阶段 Toast "错题详情即将上线" / P1 阶段跳转详情 |
| 点击 ▶ Play | mock 播放动画（P0 仅 UI） |
| 点击 📄 Transcript | 弹出转写文本 Modal |
| 点击复习计划项 | 切换 checkbox 状态 |

---

## 页面 4：录音准备 RecordPrepareScreen

### 路由
`/pages/record/prepare`

### 布局结构（完整）

```
┌──────────────────────────────────────────┐
│  [SafeArea]                              │
│  ─────────────────────────────────────── │
│  ← Prepare for Class                     │  ← NavBar 96rpx
│  ─────────────────────────────────────── │
│  [ScrollView]                            │
│                                          │
│  ═══ 课程选择 ════════════════════════════  │
│  ┌────────────────────────────────────┐  │
│  │ Biology 101                  ▼     │  │  ← 下拉选择器 88rpx
│  └────────────────────────────────────┘  │
│                                          │
│  ═══ 语言设置 ════════════════════════════  │
│  ┌─ 课堂语言 Lecture Language ──────────┐ │
│  │ 选项说明：选择老师授课时使用的语言      │ │  ← Caption
│  │ [English] [Spanish] [Chinese] [Japanese]│  ← 横向滚动标签，高亮选中
│  │ [Korean] [French] [German] [Other]    │ │
│  └──────────────────────────────────────┘ │
│                                          │
│  ┌─ 总结语言 Summary Language ──────────┐ │
│  │ ○ Same as lecture (跟随课堂语言)      │ │  ← 单选组
│  │ ● Chinese (我的母语)                  │ │     默认读 Profile
│  │ ○ English                            │ │
│  │ ○ Bilingual 中英双语                  │ │
│  └──────────────────────────────────────┘ │
│                                          │
│  ┌─ 专业术语保留 ───────────────────────┐ │
│  │ Keep academic terms in original  [ON] │  ← Switch
│  │ "mitosis / meiosis 等术语保留英文，    │ │
│  │  不翻译，方便考试复习"               │ │
│  └──────────────────────────────────────┘ │
│                                          │
│  ═══ 录音设置 ════════════════════════════  │
│  ┌─ 转写模式 Recording Mode ────────────┐ │
│  │ ● Lecture Mode  大课模式              │ │  ← 单选组
│  │ ○ Discussion Mode  讨论课模式         │ │
│  │ ○ Interview Mode  问答模式            │ │
│  └──────────────────────────────────────┘ │
│                                          │
│  ┌─ AI 笔记风格 Note Style ─────────────┐ │
│  │ ○ 简洁纪要  ● 详细笔记                │ │  ← 单选组
│  │ ○ 考试重点  ○ 按知识点拆解            │ │
│  └──────────────────────────────────────┘ │
│                                          │
│  ═══ 设备状态 ════════════════════════════  │
│  ┌─ 耳机设备 ──────────────────────────┐ │
│  │ DeviceStatusBar(full)                │ │
│  │ ┌──────────────────────────────┐    │ │
│  │ │ 🎧 Noise Reduction Earbuds   │    │ │
│  │ │    Connected · Battery 86%    │    │ │
│  │ │    Mic Test ✓ · NR Active     │    │ │
│  │ └──────────────────────────────┘    │ │
│  └──────────────────────────────────────┘ │
│                                          │
│  ┌─ 💡 提示 ──────────────────────────┐ │
│  │  "将手机放在桌面上，保持耳机连接       │ │  ← $primary-light 背景
│  │   以获得更好的收音效果"              │ │     圆角 12rpx
│  └──────────────────────────────────────┘ │
│                                          │
│  ┌────────────────────────────────────┐  │
│  │          ▶ Start Recording          │  │  ← 固定底部 100rpx
│  └────────────────────────────────────┘  │     主色填充 圆角 16rpx
│  [SafeArea Bottom]                       │
└──────────────────────────────────────────┘
```

### 选项默认值

| 选项 | 默认值 | 来源 |
|------|--------|------|
| Lecture Language | English | 手动选择，记住上次 |
| Summary Language | Chinese | Profile → Native Language |
| Keep Terms in English | ON | Profile → AI Preferences |
| Recording Mode | Lecture Mode | Profile 偏好 |
| Note Style | 详细笔记 | Profile 偏好 |

### 状态

| 状态 | 表现 |
|------|------|
| Normal | 全部选项可用 |
| 耳机未连接 | DeviceStatusBar 显示 disconnected，"Start Recording" 置灰 + 红字提示"请先连接耳机" |
| 未选课程 | 课程选择显示 placeholder "请选择课程"，按钮置灰 |
| 点击开始 | 按钮变为 loading 旋转 → navigatoTo LiveTranscript |

### 交互

| 触发 | 行为 |
|------|------|
| 点击课程选择 | 弹出课程列表 BottomSheet |
| 选择语言/模式/偏好 | 高亮选中项，记录到 `useRecordStore` |
| 切换 Keep Terms 开关 | 即时切换 |
| 点击设备卡片 | `uni.switchTab` → Profile 设备区域 |
| 点击 Start Recording | 校验（有课+有耳机）→ navigatoTo LiveTranscript |

---

## 页面 5：实时转写 LiveTranscriptScreen

### 路由
`/pages/record/live`

### ⚠️ 录音状态管理策略（v3 新增 —— 必须在代码中实现）

```
1. 录音状态、转写文本流、计时器、标记列表全部放入 useRecordStore，
   不放在页面组件的 data/ref 中。
2. LiveTranscript 页面 onHide/onUnload 时**不停止录音**。
3. 只有用户点击 "End Class" 按钮才停止录音 session。
4. App 进入后台（onAppHide）时：
   - MVP 阶段：保持 mock 数据流继续推送（模拟录音不中断）
   - 生产阶段：需申请后台录音权限 + 显示通知栏常驻提示
5. 切换 Tab 后再进入录音页：
   - onShow 时从 store 恢复转写文本、计时器、标记列表
   - 自动滚动到最新文本位置
6. 耳机断开（mock 模拟）：
   - store.isRecording 设为 false
   - 计时器暂停
   - 顶部显示红色提示条 "耳机已断开，录音已暂停"
```

### 布局结构（完整）

```
┌──────────────────────────────────────────┐
│  [SafeArea]                              │
│  ─────────────────────────────────────── │
│  Biology 101           🎧  •  00:18:32   │  ← 顶部栏 80rpx
│  ─────────────────────────────────────── │
│                                          │
│  ┌────────────────────────────────────┐  │
│  │                                    │  │  ← 转写文本区域
│  │  The process of mitosis begins     │  │     scroll-view 自动滚动
│  │  with prophase, where the nuclear  │  │     Body 28rpx 行高1.8
│  │  membrane breaks down and...       │  │
│  │  ▎currently recognizing            │  │  ← 当前句：$primary-light 背景
│  │                                    │  │     左侧闪烁光标
│  │  In this stage, chromosomes...     │  │
│  │                                    │  │
│  └────────────────────────────────────┘  │
│                                          │
│  ┌─ 标记按钮栏 ────────────────────────┐  │
│  │ [🔖 Mark] [❓Confusing] [⭐Important] │  │  ← 横向 scroll-view
│  │ [📝 Exam] [💬 Question] [📌 Review]  │  │     圆角标签 56rpx高
│  └──────────────────────────────────────┘  │     间距 16rpx
│  ─────────────────────────────────────── │
│  │ ⏸ Pause           ⏹ End Class       │  │  ← 底部操作栏 100rpx
│  └──────────────────────────────────────┘  │
│  [SafeArea Bottom]                       │
└──────────────────────────────────────────┘
```

### 标记类型定义

| 标记 | 颜色 | 图标 | Key |
|------|------|------|-----|
| Mark（通用） | 灰色 #9CA3AF | 🔖 | `mark.generic` |
| Confusing（没听懂） | 黄色 #F59E0B | ❓ | `mark.confusing` |
| Important（重点） | 红色 #EF4444 | ⭐ | `mark.important` |
| Exam（可能会考） | 绿色 #10B981 | 📝 | `mark.exam` |
| Question（有问题） | 蓝色 #3B82F6 | 💬 | `mark.question` |
| Review（稍后复习） | 紫色 #8B5CF6 | 📌 | `mark.review` |

### 时间轴 BottomSheet（上滑弹出，占屏幕60%）

```
┌──────────────────────────────────────────┐
│  ── Timeline ──              ✕ 关闭     │  ← 拖拽手柄 40rpx×8rpx 灰
│  ─────────────────────────────────────── │
│  [ScrollView]                            │
│                                          │
│  ● 00:03:12  Introduction to Mitosis    │  ← 自动生成的时间节点
│  │                                       │     灰点+灰字
│  ● 00:08:45  🟡 Marked: Confusing       │  ← 用户标记点
│  │  "...the difference between..."       │  │     彩色圆点
│  │  [AI Explain] [▶ Play] [📌 Review]   │  │     操作按钮 48rpx高
│  │                                       │
│  ● 00:12:20  Teacher emphasized this    │
│  │                                       │
│  ● 00:18:32  🟢 Marked: Exam Point      │
│  │  "...this will definitely be on..."   │
│  │  [AI Explain] [▶ Play] [📌 Review]   │
│  │                                       │
│  ● 00:26:32  🔴 Marked: Question        │
│                                          │
└──────────────────────────────────────────┘
  背景白色 圆角顶部 32rpx
  拖拽手柄居中
```

### 关键状态

| 状态 | 触发 | 表现 |
|------|------|------|
| 录音中 | 进入页面 | 转写文本逐条 mock 推送，计时器走，标记按钮可用 |
| 暂停 | 点击 Pause | 文本停止更新，计时器闪烁，"▶ Resume" 替换 Pause |
| 标记 | 点击标记按钮 | 短震动反馈，按钮短暂变色(200ms)，时间轴插入标记点 |
| 耳机断开 | mock 模拟断连 | 顶部红底提示条(72rpx) "耳机已断开，录音已暂停" |
| 结束确认 | 点击 End Class | 弹出确认 Dialog "确定结束本次课堂？" + 取消/确认 |
| 确认结束 | 点击确认 | 跳转 ProcessingOverlay |

### 交互

| 触发 | 行为 |
|------|------|
| 点击标记按钮 | store 记录当前时间戳+标记类型，按钮变色反馈 |
| 上滑手势 | 打开时间轴 BottomSheet |
| 点击时间轴标记 | 展开标记详情 |
| 点击 "AI Explain" | mock 调用，loading 1秒后显示 AI 解释文本 |
| 点击 "▶ Play" | mock 播放（P0 仅 UI 变化） |
| 点击 Pause | store.isPaused = true |
| 点击 Resume | store.isPaused = false |
| 点击 End Class | 弹出确认框 |

---

## 过渡视图：处理中 ProcessingOverlay

### 类型
全屏 Modal，不独立路由，从 LiveTranscript → AISummary 的过渡态

### 布局结构（完整）

```
┌──────────────────────────────────────────┐
│                                          │
│                                          │
│              ✨ [动画图标]                 │  ← Lottie 或 CSS 旋转动画
│          AI 正在整理你的课堂...            │  ← H2
│                                          │
│         正在保存录音...           ✓       │  ← 步骤列表
│         正在生成 AI 总结...       ⟳       │     Body 28rpx
│         正在整理时间轴标记...     ⏳       │     已完成：绿色 ✓
│         正在识别重点知识点...     ⏳       │     进行中：蓝色 ⟳ 旋转
│         正在个性化分析...         ⏳       │     等待中：灰色 ⏳
│                                          │
│         ┌──────────────────┐             │
│         │  预计还需 30 秒   │             │  ← 灰色标签 圆角
│         └──────────────────┘             │
│                                          │
│          请不要关闭应用                   │  ← Caption 灰色
│                                          │
└──────────────────────────────────────────┘
  背景: 白色
```

### 状态

| 阶段 | 表现 |
|------|------|
| 处理中 | 步骤逐条完成（✓），动画播放，进度条推进 |
| 全部完成 | 所有步骤 ✓ → 延迟 500ms → 自动 navigatoTo AISummary |
| 处理失败 | 某步骤 ✕ → "生成失败" + "重试"/"稍后查看" 两个按钮 |

### 实现说明
P0 阶段用 setTimeout 模拟：进入后每隔 1.5 秒完成一个步骤，5 步完成后自动跳转。

---

## 页面 6：AI 总结 AISummaryScreen

### 路由
`/pages/record/summary?id=xxx`

### 布局结构（完整）

```
┌──────────────────────────────────────────┐
│  [SafeArea]                              │
│  ─────────────────────────────────────── │
│  ← Biology 101 · May 28                  │  ← NavBar 96rpx
│  ─────────────────────────────────────── │
│  [ScrollView]                            │
│                                          │
│  ┌─ 录音信息条 ────────────────────────┐  │
│  │  52 min · 4 marks · Accuracy: 95%   │  │  ← 灰色背景条 72rpx
│  └──────────────────────────────────────┘  │
│                                          │
│  ═══ Section: 课堂总结 ═══════════════════  │  ← 展开
│  │  "本节课主要讲解了细胞分裂的基本       │  │
│  │   过程，重点包括有丝分裂阶段..."       │  │
│  ═══════════════════════════════════════  │
│                                          │
│  ═══ Section: 结构化笔记 ════════════════  │  ← 展开
│  │  📌 Topic 1: Cell Division Overview  │  │
│  │     • Key concept: ...               │  │
│  │     • Explanation: ...               │  │
│  │     • Example: ...                   │  │
│  │  📌 Topic 2: Mitosis                 │  │
│  │     • Prophase → Metaphase → ...     │  │
│  ═══════════════════════════════════════  │
│                                          │
│  ═══ Section: 你的标记重点 ══════════════  │  ← 展开+高亮 border $primary
│  │  TimelineMark × 4                     │  │
│  │  (每个标记附 AI 扩展解释)              │  │
│  ═══════════════════════════════════════  │
│                                          │
│  ┌─────────────────────────────────────┐ │
│  │  🌟 Personalized for You      ▼     │ │  ← 展开+高亮 border $accent
│  │  ────────────────────────────────── │ │     背景 $accent-light
│  │  Based on your profile:             │ │
│  │  ┌───────────────────────────────┐  │ │
│  │  │ 🏫 Major: Biology              │  │ │
│  │  │ 🗣️ Native: Chinese             │  │ │
│  │  │ 📊 English Level: Intermediate │  │ │
│  │  │ 🎯 Goal: Prepare for exams     │  │ │
│  │  └───────────────────────────────┘  │ │
│  │                                     │ │
│  │  AI has adapted this summary:       │ │
│  │  ✅ Simplified complex concepts     │ │
│  │  ✅ Kept "mitosis/meiosis" in EN    │ │
│  │  ✅ Expanded all your marked parts  │ │
│  │  ✅ Generated exam-style questions  │ │
│  └─────────────────────────────────────┘ │
│                                          │
│  ═══ Section: 考试重点预测 ═══════════════  │  ← 折叠
│  │  • 可能考点 1: Mitosis vs Meiosis 对比 │  │
│  │  • 可能考点 2: 染色体复制机制          │  │
│  │  • 易错点: 减数分裂阶段混淆            │  │
│  │  • 背诵概念: Cell cycle phases       │  │
│  ═══════════════════════════════════════  │
│                                          │
│  ═══ Section: 关键术语 ═══════════════════  │  ← 折叠
│  │  ┌──────────┐ ┌───────────┐          │  │
│  │  │ Mitosis  │ │ Meiosis   │          │  │  ← 术语卡片
│  │  │ 细胞分裂  │ │ 减数分裂  │          │  │
│  │  └──────────┘ └───────────┘          │  │
│  ═══════════════════════════════════════  │
│                                          │
│  ═══ Section: 复习任务 ═══════════════════  │  ← 展开
│  │  ☐ 今天复习 10 分钟                   │  │
│  │  ☐ 完成 5 张 AI flashcards            │  │
│  │  ☐ 回看 2 个标记片段                  │  │
│  ═══════════════════════════════════════  │
│                                          │
│  ─────────────────────────────────────── │
│  [📤 Share]  [📥 Save to KB]  [📝 Note] │  ← 底部固定 100rpx
│  ─────────────────────────────────────── │
│  [SafeArea Bottom]                       │
└──────────────────────────────────────────┘
```

### Section 折叠行为

| Section | 默认 | 视觉特征 |
|---------|------|---------|
| 课堂总结 | 展开 | 无特殊 |
| 结构化笔记 | 展开 | 无特殊 |
| 你的标记重点 | **展开** | 左边框 6rpx `$primary` |
| Personalized for You | **展开** | 左边框 6rpx `$accent`，背景 `$accent-light`，🌟 |
| 考试重点预测 | 折叠 | 点击展开 |
| 关键术语 | 折叠 | 点击展开 |
| 复习任务 | 展开 | checkbox 可操作 |

### 状态

| 状态 | 表现 |
|------|------|
| 生成中 | 显示 ProcessingOverlay |
| Normal | 全部 Section 渲染 |
| 部分生成失败 | 失败 Section 显示 "生成失败，点击重试" |
| 全部失败 | Error 提示 + "重新生成"/"稍后查看" |
| 标记区无内容 | "你的标记重点" Section 不显示 |
| Profile 未填写 | Personalized Section 显示 "完善档案以获得更精准总结" + 去填写按钮 |

### 交互

| 触发 | 行为 |
|------|------|
| 点击 Section 标题栏 | 折叠/展开切换 |
| 点击 ✕ (关闭) 或 ← 返回 | `uni.navigateBack` |
| 点击 Share | 系统分享（P0 mock Toast） |
| 点击 Save to KB | 写入 useCourseStore → Toast "已保存到知识库" |
| 点击 Add Note | 弹出文本输入 BottomSheet |
| 点击复习任务 checkbox | 切换完成状态 |
| 点击 TimelineMark | 展开/收起标记详情 |

---

## 页面 7：知识库首页 KnowledgeBaseScreen

### 路由
`/pages/knowledge/index`

### 布局结构（完整 —— v3 修正为 2×3 六宫格）

```
┌──────────────────────────────────────────┐
│  [SafeArea]                              │
│  ─────────────────────────────────────── │
│  Knowledge Base                          │  ← 标题 96rpx
│  ─────────────────────────────────────── │
│                                          │
│  ┌─ 搜索 ──────────────────────────────┐ │
│  │  🔍 Search your classes, notes...    │ │  ← SearchBar 80rpx
│  └──────────────────────────────────────┘ │
│                                          │
│  ┌─ 分类入口（2×3 六宫格）──────────────┐ │
│  │  ┌──────┐  ┌──────┐  ┌──────┐      │ │  每个 200rpx×160rpx
│  │  │ 🎙️   │  │ 📝   │  │ 📌   │      │ │  圆角 16rpx
│  │  │Recor- │  │ AI   │  │ Marks│      │ │  背景 $bg-card
│  │  │ dings │  │Notes │  │      │      │ │
│  │  │12     │  │21    │  │8     │      │ │
│  │  └──────┘  └──────┘  └──────┘      │ │
│  │  ┌──────┐  ┌──────┐  ┌──────┐      │ │
│  │  │ ✏️   │  │ 📤   │  │ 🃏   │      │ │  第二行灰色态
│  │  │Mista-│  │Upload│  │Flash-│      │ │  灰色图标+灰色文字
│  │  │ kes  │  │ s    │  │cards │      │ │  无数量显示
│  │  │Coming│  │Coming│  │Coming│      │ │  "Coming Soon" 标签
│  │  │ Soon │  │ Soon │  │ Soon │      │ │
│  │  └──────┘  └──────┘  └──────┘      │ │
│  └──────────────────────────────────────┘ │
│                                          │
│  ┌─ 最近资料 ───────────────────────────┐ │
│  │  RecordingCard × 3                    │ │  ← 取最近3条
│  │  NoteCard × 3                         │ │  ← 取最近3条
│  └──────────────────────────────────────┘ │
│                                          │
│  ┌─ 待复习标记 ─────────────────────────┐ │
│  │  ┌──────────────────────────────┐    │ │
│  │  │ 🟡 Biology · cell division   │    │ │  ← 紧凑标记卡片
│  │  │    2 days ago · Confusing [→]│    │ │     背景 $bg-card
│  │  └──────────────────────────────┘    │ │     带对应颜色圆点
│  │  ┌──────────────────────────────┐    │ │
│  │  │ 🔴 Economics · supply curve  │    │ │
│  │  │    3 days ago · Question [→] │    │ │
│  │  └──────────────────────────────┘    │ │
│  └──────────────────────────────────────┘ │
│                                          │
└──────────────────────────────────────────┘
```

### 六宫格详情

| 位置 | 入口 | 图标 | 状态 | P0 行为 |
|------|------|------|------|---------|
| 第1行第1列 | Recordings | 🎙️ | **活跃**，显示数量 | 点击 → 录音列表页（可简化） |
| 第1行第2列 | AI Notes | 📝 | **活跃**，显示数量 | 点击 → 笔记列表页 |
| 第1行第3列 | Timeline Marks | 📌 | **活跃**，显示数量 | 点击 → 标记汇总列表 |
| 第2行第1列 | Mistakes | ✏️ | **Coming Soon**，灰态 | 不可点击 / Toast "即将上线" |
| 第2行第2列 | Uploads | 📤 | **Coming Soon**，灰态 | 不可点击 / Toast "即将上线" |
| 第2行第3列 | Flashcards | 🃏 | **Coming Soon**，灰态 | 不可点击 / Toast "即将上线" |

### 状态表

| 状态 | 表现 |
|------|------|
| Loading | 六宫格骨架 + 3个卡片骨架 |
| Normal | 六宫格 + 最近资料 + 待复习标记 |
| Empty（无数据） | 活跃入口显示0，最近资料区 EmptyState("还没有学习资料", "开始你的第一堂课吧") |
| Empty（无标记） | 待复习标记区隐藏 |
| Error | 顶部 Error 提示 |

### 交互

| 触发 | 行为 |
|------|------|
| 点击 Recordings | navigatoTo → 录音列表 |
| 点击 AI Notes | navigatoTo → 笔记列表 |
| 点击 Timeline Marks | navigatoTo → 标记汇总列表 |
| 点击 Coming Soon 入口 | Toast "即将上线" 或无反应 |
| 点击 RecordingCard | navigatoTo → 课程详情 Sessions Tab |
| 点击 NoteCard | navigatoTo → AI 总结 |
| 点击待复习标记 | navigatoTo → 对应录音时间轴 |
| 搜索栏输入 | 搜索 mock 数据，下拉展示匹配结果 |

---

## 页面 8：我的/学生档案 ProfileScreen

### 路由
`/pages/profile/index`

### 布局结构（完整）

```
┌──────────────────────────────────────────┐
│  [SafeArea]                              │
│  ─────────────────────────────────────── │
│  Profile / 我的                           │  ← 标题 96rpx
│  ─────────────────────────────────────── │
│  [ScrollView]                            │
│                                          │
│  ═══ 学生档案 Student Profile ═══════════  │
│  ┌────────────────────────────────────┐  │
│  │  Name         [Alex Chen        ]  │  │  ← u-input 圆角
│  │  School       [UC Berkeley      ]  │  │
│  │  Major        [Biology          ]  │  │
│  │  Grade        [Sophomore     ▼  ]  │  │  ← u-select
│  │  Native Lang  [Chinese       ▼  ]  │  │
│  │  English Lv   [Intermediate  ▼  ]  │  │
│  │  Study Goal   [Prepare for exams]  │  │
│  └────────────────────────────────────┘  │
│                                          │
│  ═══ 耳机设备 My Device ═════════════════  │
│  │ DeviceStatusBar(full)                │
│  │ ┌──────────────────────────────┐    │
│  │ │ 🎧 Noise Reduction Earbuds   │    │
│  │ │    Connected · Battery 86%    │    │
│  │ │ ──────────────────────────── │    │
│  │ │ Noise Reduction Mode:        │    │  ← 单选组
│  │ │ ● Classroom  ○ Discussion    │    │
│  │ │ ○ Library    ○ Outdoor       │    │
│  │ │ ──────────────────────────── │    │
│  │ │ [🎤 Mic Test] [🔊 Audio Test] │    │  ← 操作按钮
│  │ │ Firmware: v2.1.0  [Update]   │    │
│  │ └──────────────────────────────┘    │
│  └──────────────────────────────────────┘ │
│                                          │
│  ═══ AI 个性化设置 ═══════════════════════  │
│  │ ┌────────────────────────────────┐  │
│  │ │ Note Style:                    │  │  ← 单选组
│  │ │ ● 详细型 Detailed              │  │
│  │ │ ○ 简洁型 Concise               │  │
│  │ │ ○ 考试型 Exam-focused          │  │
│  │ │                                │  │
│  │ │ Keep academic terms in EN [ON] │  │  ← Switch 组
│  │ │ Auto-generate flashcards  [ON] │  │
│  │ │ Auto-extract exam points  [ON] │  │
│  │ │ Expand confusing marks    [ON] │  │
│  │ │ Connect mistakes w/ notes [ON] │  │
│  │ │ Weekly review plan        [ON] │  │
│  │ └────────────────────────────────┘  │
│  └──────────────────────────────────────┘ │
│                                          │
│  ═══ 应用设置 ════════════════════════════  │
│  │ App Language:     [English / 中文]   │  ← 切换按钮（立即生效）
│  │ Summary Language: [Chinese ▼]       │  ← 下拉
│  │ About · Version 1.0.0               │  ← 版本号 Caption
│  └──────────────────────────────────────┘ │
│                                          │
│  ─────────────────────────────────────── │
│          💾 Save Changes                  │  ← 固定底部 100rpx 主色
│  ─────────────────────────────────────── │
│  [SafeArea Bottom]                       │
└──────────────────────────────────────────┘
```

### 表单字段

| 字段 | 组件 | 选项 |
|------|------|------|
| Name | `<u-input>` | 自由输入 |
| School | `<u-input>` | 自由输入 |
| Major | `<u-input>` | 自由输入 |
| Grade | `<u-select>` | Freshman / Sophomore / Junior / Senior / Graduate / PhD |
| Native Language | `<u-select>` | Chinese / English / Spanish / Japanese / Korean / Other |
| English Level | `<u-select>` | Beginner / Elementary / Intermediate / Upper-Intermediate / Advanced / Proficient |
| Study Goal | `<u-input>` | 自由输入 |

### 状态

| 状态 | 表现 |
|------|------|
| Normal | 已填写信息渲染 |
| 首次使用 | 所有字段空，顶部引导提示 "填写档案以获得个性化学习体验" |
| 未连接耳机 | DeviceStatusBar 显示 disconnected，降噪模式不可选（灰态） |
| 保存中 | Save Changes 按钮 loading |
| 保存成功 | Toast "已保存" |
| 保存失败 | Toast "保存失败，请重试" |

### 交互

| 触发 | 行为 |
|------|------|
| 修改任何字段 | Save 按钮高亮变主色 |
| 点击 Save | 写入 useUserStore → uni.setStorageSync → Toast |
| 切换 App Language | `locale.value = 'en'/'zh-CN'`，全 App 立即生效 |
| 切换 Summary Language | 影响 RecordPrepare 默认值 |
| 点击 Mic Test | Mock 显示音量波形动画 → 2s 后显示 "Mic Test ✓" |
| 点击 Firmware Update | Toast "已是最新版本" |

---

## 附录A：路由配置

```json
{
  "pages": [
    { "path": "pages/home/index",      "style": { "navigationStyle": "custom" } },
    { "path": "pages/courses/index",   "style": { "navigationStyle": "custom" } },
    { "path": "pages/courses/detail",  "style": { "navigationStyle": "custom" } },
    { "path": "pages/record/prepare",  "style": { "navigationStyle": "custom" } },
    { "path": "pages/record/live",     "style": { "navigationStyle": "custom" } },
    { "path": "pages/record/summary",  "style": { "navigationStyle": "custom" } },
    { "path": "pages/knowledge/index", "style": { "navigationStyle": "custom" } },
    { "path": "pages/profile/index",   "style": { "navigationStyle": "custom" } }
  ],
  "tabBar": {
    "custom": false,
    "list": [
      { "pagePath": "pages/home/index",      "text": "首页" },
      { "pagePath": "pages/courses/index",   "text": "课程" },
      { "pagePath": "pages/record/prepare",  "text": "录音", "midButton": true },
      { "pagePath": "pages/knowledge/index", "text": "知识库" },
      { "pagePath": "pages/profile/index",   "text": "我的" }
    ]
  }
}
```

**midButton 兼容说明**: 如目标平台不支持原生 `midButton`，则设置 `tabBar.custom: true`，编写 `src/custom-tab-bar/index.vue` 实现自定义凸起按钮。

**路由注意**: live / summary 不在 Tab 中，从 prepare 页 `uni.navigateTo` 进入。

---

## 附录B：数据模型 TypeScript 定义

```typescript
// ===== 课程 =====
interface Course {
  id: string
  name: string
  teacher: string
  schedule: string
  semester: string
  week: number
  recordingCount: number
  noteCount: number
  unresolvedMarks: number
}

// ===== 课堂录音记录 =====
interface Recording {
  id: string
  courseId: string
  courseName: string
  date: string
  duration: number
  transcriptAccuracy: number
  markCount: number
  summaryStatus: 'processing' | 'ready' | 'failed'
  language: string
  mode: string
}

// ===== AI 笔记/总结 =====
interface AINote {
  id: string
  recordingId: string
  courseName: string
  topic: string
  summary: string
  structuredNotes: TopicNode[]
  keyTerms: TermCard[]
  examPoints: string[]
  reviewTasks: ReviewTask[]
  personalizedNote?: PersonalizedAdaptation
}

interface TopicNode {
  title: string
  keyConcept: string
  explanation: string
  example?: string
  children?: TopicNode[]
}

interface TermCard {
  term: string
  definition: string
  relatedTopic?: string
}

interface ReviewTask {
  id: string
  description: string
  completed: boolean
  estimatedMinutes: number
}

interface PersonalizedAdaptation {
  basedOn: {
    major: string
    nativeLanguage: string
    englishLevel: string
    studyGoal: string
  }
  adaptations: string[]
}

// ===== 时间轴标记 =====
interface TimelineMark {
  id: string
  recordingId: string
  timestamp: number
  type: MarkType
  transcript: string
  aiExplanation?: string
  relatedNotes?: string[]
  inReviewPlan: boolean
}

type MarkType = 'confusing' | 'important' | 'exam' | 'question' | 'review'

const MARK_COLORS: Record<MarkType, string> = {
  confusing: '#F59E0B',
  important: '#EF4444',
  exam: '#10B981',
  question: '#3B82F6',
  review: '#8B5CF6'
}

// ===== 学生档案 =====
interface StudentProfile {
  name: string
  school: string
  major: string
  grade: string
  nativeLanguage: string
  lectureLanguage: string
  summaryLanguage: string
  englishLevel: string
  studyGoal: string
}

// ===== AI 偏好 =====
interface AIPreferences {
  noteStyle: 'detailed' | 'concise' | 'exam'
  keepTermsInEnglish: boolean
  autoGenerateFlashcards: boolean
  autoExtractExamPoints: boolean
  expandConfusingMarks: boolean
  connectMistakesToLectures: boolean
  weeklyReviewPlan: boolean
}

// ===== 错题 =====
interface Mistake {
  id: string
  courseId: string
  imageUrl: string
  title: string
  tags: string[]
  mastered: boolean
  aiExplanation?: string
}

// ===== 录音配置 =====
interface RecordingConfig {
  courseId: string
  lectureLanguage: string
  summaryLanguage: string
  keepTermsInEnglish: boolean
  recordingMode: 'lecture' | 'discussion' | 'interview'
  noteStyle: 'detailed' | 'concise' | 'exam' | 'byTopic'
}
```

---

## 附录C：uni-app 开发文件目录

```
newmax-app/
├── src/
│   ├── pages/
│   │   ├── home/index.vue
│   │   ├── courses/
│   │   │   ├── index.vue
│   │   │   └── detail.vue
│   │   ├── record/
│   │   │   ├── prepare.vue
│   │   │   ├── live.vue
│   │   │   ├── summary.vue
│   │   │   └── components/
│   │   │       ├── TimelineSheet.vue
│   │   │       └── ProcessingOverlay.vue
│   │   ├── knowledge/index.vue
│   │   └── profile/index.vue
│   ├── components/
│   │   ├── DeviceStatusBar.vue
│   │   ├── CourseCard.vue
│   │   ├── NoteCard.vue
│   │   ├── RecordingCard.vue
│   │   ├── TimelineMark.vue
│   │   ├── MistakeCard.vue
│   │   ├── AISummarySection.vue
│   │   ├── EmptyState.vue
│   │   └── SearchBar.vue
│   ├── stores/
│   │   ├── useCourseStore.ts
│   │   ├── useRecordStore.ts
│   │   ├── useUserStore.ts
│   │   └── useDeviceStore.ts
│   ├── locales/
│   │   ├── zh-CN.json
│   │   └── en.json
│   ├── styles/uni.scss
│   ├── types/index.ts
│   └── utils/api.ts
├── CLAUDE.md
├── pages.json
├── manifest.json
└── uno.config.ts
```

---

## 附录D：v2 → v3 变更清单

| # | 变更项 | 说明 |
|---|--------|------|
| ① | **所有页面布局完整展开** | 页面2/3/5/ProcessingOverlay/Timeline Sheet 不再标记"与v1相同，略"，每页有完整的ASCII线框图+组件清单+交互表 |
| ② | **midButton 兼容说明** | Tab 配置区新增"如平台不支持则使用自定义 TabBar"策略 |
| ③ | **录音状态管理策略** | 页面5新增⚠️区块，明确 store 持久化、onHide不断录音、只有End Class才停止、后台/耳机断连处理 |
| ④ | **KnowledgeBase 六宫格** | 2×3 六宫格，3个活跃入口(Recordings/AI Notes/Marks) + 3个 Coming Soon(Mistakes/Uploads/Flashcards)，灰态不可点击 |
| ⑤ | **开发约束声明** | 文档开头新增9条约束，明确 mock-only、store集中管理、组件复用、i18n、四态处理 |
| ⑥ | **所有交互表补全** | 每页交互表从简写扩展为具体的 `uni.navigateTo` / `uni.switchTab` 路径 |
| ⑦ | **路由配置更新** | pages.json 加入 knowledge/index 和 profile/index |
| ⑧ | **底部操作栏按钮文本更新** | AI总结页 "Save" → "Save to KB" 语义更清晰 |
