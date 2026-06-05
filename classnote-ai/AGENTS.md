# ClassNote AI — 前端 AI 开发规范

## 项目简介
ClassNote AI 是一款面向海外留学生的课堂 AI 笔记 App。
核心功能：课程管理、课堂录音与实时转写、时间轴标记、AI 总结、知识库、个性化学习档案。

## 技术栈
- **框架**：uni-app (Vue3 Composition API)
- **语言**：TypeScript (strict)
- **构建**：Vite 5 + @dcloudio/vite-plugin-uni
- **CSS**：SCSS + UnoCSS（Phase 1 接入）
- **状态管理**：Pinia
- **国际化**：vue-i18n（中/英双语）
- **设计基准**：750rpx

## 开发约束
- ⚠️ **零后端**：所有数据使用本地 mock，禁止发起 HTTP 请求
- ⚠️ **无真实 AI**：AI 相关功能使用预置 mock 数据
- ⚠️ **无真实录音**：录音相关状态用 Pinia store 模拟
- ⚠️ **不新增页面**：页面范围严格限定在 UI Spec v3 定义的 8 个页面
- ⚠️ **每个页面必须处理三种状态**：loading、empty、error
- ⚠️ **禁止硬编码文案**：所有可见文本走 $t()

## 页面范围（UI Spec v3）

### Tab 页面（底部 5 Tab）
| 路径 | 标题 key | 说明 |
|------|---------|------|
| `pages/home/index` | `home.title` | 首页 |
| `pages/courses/index` | `courses.title` | 课程列表 |
| `pages/record/prepare` | `record.prepareTitle` | 录音准备（中间 Tab） |
| `pages/knowledge/index` | `knowledge.title` | 知识库 |
| `pages/profile/index` | `profile.title` | 个人页 |

### 非 Tab 页面（路由跳转）
| 路径 | 标题 key | 说明 |
|------|---------|------|
| `pages/courses/detail` | `courseDetail.title` | 课程详情 |
| `pages/record/live` | `record.liveTitle` | 实时转写 |
| `pages/record/summary` | `summary.title` | AI 总结 |

## 共享组件规范
以下组件为全局共享，独立封装，禁止在页面内重复实现：

| 组件 | 使用场景 |
|------|---------|
| `DeviceStatusBar` | 首页、录音准备页 |
| `CourseCard` | 课程列表、首页 |
| `NoteCard` | 首页、AI 总结、知识库 |
| `RecordingCard` | 课程详情、知识库 |
| `TimelineMark` | AI 总结、时间轴 BottomSheet |
| `AISummarySection` | AI 总结页各 Section |
| `EmptyState` | 全局空态 |
| `SearchBar` | 课程列表、知识库 |

## Pinia Store 规范
- `useUserStore`：学生档案、AI 偏好、App 语言
- `useCourseStore`：课程列表、当前课程
- `useRecordStore`：录音状态、转写段落、时间轴标记
- `useDeviceStore`：耳机连接、电���、ANC 状态

所有 store 使用本地 mock 数据，不调用后端 API。

## i18n 规范
- 翻译文件位置：`src/locales/zh-CN.json` / `en.json`
- 初始化逻辑：`src/locales/index.ts`
- 语言持久化：`uni.getStorageSync` / `uni.setStorageSync` key=`locale`
- 默认语言：zh-CN
- 命名规则：`模块.组件.属性`，如 `home.greeting.morning`

## 样式规范
- 设计基准：750rpx
- 主色：`#4F46E5`
- 页面背景：`#F3F4F6`
- 卡片背景：`#FFFFFF`
- 全局变量定义在 `src/styles/variables.scss`
- 最小触控区域：44×44px（88rpx）
- 安全区适配：`padding-top: env(safe-area-inset-top)`

## 禁止事项
- ❌ 不要在页面内硬编码中文或英文文案
- ❌ 不要在每个页面重写已存在的共享组件
- ❌ 不要接任何真实后端 API
- ❌ 不要新增 UI Spec v3 之外的页面
- ❌ 不要引入未在 AGENTS.md 声明的依赖
- ❌ 单个 .vue 文件不超过 300 行（超出即拆分组件）
