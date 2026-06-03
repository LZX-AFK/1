# ClassNote AI — AI 开发规范

## 项目简介

面向海外留学生的课堂 AI 笔记 App。
核心功能：课程管理、课堂录音准备、实时转写、时间轴标记、AI 总结、知识库、学生档案个性化、耳机设备状态展示。

## 技术栈

- 框架：uni-app（标准根目录结构，无 src/ 前缀）
- 语言：Vue3 Composition API + TypeScript (strict)
- 样式：SCSS（uni.scss 全局变量）+ UnoCSS（辅助工具类）
- 状态：Pinia（stores/ 目录）
- 国际化：vue-i18n v9（locales/ 目录，中/英双语）
- 类型：types/index.ts 统一定义

## 页面范围（MVP，禁止新增）

### Tab 页面（5个）
- pages/home/index        首页
- pages/courses/index     课程列表
- pages/record/prepare    录音准备（中间 Tab）
- pages/knowledge/index   知识库
- pages/profile/index     个人页

### 非 Tab 页面（3个，只能通过 navigateTo 进入）
- pages/courses/detail    课程详情
- pages/record/live       实时转写
- pages/record/summary    AI 总结

## 共享组件（Phase 1 完善，禁止跨页面重复实现）

| 组件 | 文件 | 使用场景 |
|------|------|----------|
| DeviceStatusBar | components/DeviceStatusBar.vue | 首页 / 录音准备 |
| CourseCard | components/CourseCard.vue | 首页 / 课程列表 |
| NoteCard | components/NoteCard.vue | 首页 / AI总结 / 知识库 |
| RecordingCard | components/RecordingCard.vue | 课程详情 / 知识库 |
| TimelineMark | components/TimelineMark.vue | AI总结 / 时间轴Sheet |
| AISummarySection | components/AISummarySection.vue | AI总结页 Section容器 |
| EmptyState | components/EmptyState.vue | 全局空态占位 |
| SearchBar | components/SearchBar.vue | 课程列表 / 知识库 |

## i18n 规范

- 所有页面可见文字必须使用 $t() 或 useI18n().t()，禁止硬编码
- Key 命名规则：{模块}.{元素}.{属性}，例如 home.greeting.morning
- 新增翻译同时写 zh-CN.json 和 en.json
- 语言切换入口在 pages/profile/index，调用 setLocale()

## Pinia Store 规范

- 所有类型从 types/index.ts 引入
- 当前阶段使用本地 mock 数据，禁止接真实后端接口
- useRecordStore 保管录音生命周期状态，切 Tab 不得销毁

## 样式规范

- 设计基准：750rpx
- 主色：#4F46E5（CSS var: $color-primary）
- 全局变量定义在 styles/variables.scss，通过 uni.scss 全局注入
- 最小点击区域：44x44px（约 88rpx x 88rpx）

## 颜色系统

| 用途 | 颜色 | SCSS 变量 |
|------|------|-----------|
| 主色 | #4F46E5 | $color-primary |
| 主色深 | #3730A3 | $color-primary-dark |
| 强调色 | #8B5CF6 | $color-accent |
| 强调浅 | #F5F3FF | $color-accent-light |
| 页面背景 | #F3F4F6 | $color-bg-page |
| 卡片背景 | #FFFFFF | $color-bg-card |
| 主文字 | #1F2937 | $color-text-primary |
| 次文字 | #6B7280 | $color-text-secondary |
| 辅助文字 | #9CA3AF | $color-text-tertiary |
| 成功 | #10B981 | $color-success |
| 警告 | #F59E0B | $color-warning |
| 错误 | #EF4444 | $color-error |
| 信息 | #3B82F6 | $color-info |

## 间距系统

| 名称 | 值 | 变量 |
|------|-----|------|
| xs | 8rpx | $spacing-xs |
| sm | 16rpx | $spacing-sm |
| md | 24rpx | $spacing-md |
| lg | 32rpx | $spacing-lg |
| xl | 48rpx | $spacing-xl |

## 开发约束

1. 禁止新增 UI Spec v3 范围外的页面
2. 禁止接真实后端，当前阶段只用 mock 数据
3. 禁止实现真实录音、真实 AI 调用
4. 每个页面必须处理 loading / empty / error 三态
5. 单文件超过 300 行必须拆组件
6. TabBar 中间按钮：当前用标准第3 Tab，Phase 1 升级为自定义 TabBar 实现圆形凸起效果
7. 录音页（record/live）不在 TabBar，用 navigateTo 进入，用 navigateBack 退出
8. useRecordStore 管理录音状态，切 Tab 保持状态（keep-alive），只有"结束课堂"按钮才停止录音
