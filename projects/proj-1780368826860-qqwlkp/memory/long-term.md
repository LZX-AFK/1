# 长期记忆

## 项目概览
- 项目名称：ClassNote AI（基于 Oleap 降噪耳机的课堂 AI 笔记 App）
- 技术栈：uni-app (Vue 3 + TypeScript + Pinia) + Fastify 后端 + Deepgram ASR + GPT-4o
- 目标平台：iOS / Android（海外学生用户）
- 仓库：https://github.com/gitcursora/oleap

## 用户偏好
- 偏好将开发任务明确写入日程，并划分每天的具体节点
- 决策：今天（6月2日）完成全部6个开发节点（阶段0至阶段6），明天（6月3日）专注于验收和调试（Debug）

## 2026-06-02 自动提取
- 项目骨架已建立：6个页面空壳目录（live-transcription、my-courses、prepare-recording、ai-summary、timeline-markers）

## 2026-06-02 阶段0完成
- uni-app 项目脚手架搭建完成，16个文件产出
- 品牌色：`#6C63FF`（主色）、`#0F0F1A`（背景）、`#00D9A6`（辅助色）
- MVP 阶段使用手机麦克风，BLE 耳机接口预留但未实现
- WebSocket 地址和 API Base URL 标记为 `TODO`，需替换为实际后端地址
- tabBar 图标文件（/static/tabbar/）尚未添加

## 2026-06-02 阶段1+2完成
- P05 我的课程页 + P11 准备录音页 完成，6个文件产出/更新
- 新增 `types/course.ts` — 课程类型定义、8种主题色、中英文学科标签、Mock数据3门课程
- 新增 `CourseCard.vue` 组件 — 可复用的课程卡片（色条+标签+进度+箭头）
- session store 扩展 `createSession()` — POST /api/sessions + MVP降级本地mock
- 页面流程：首页→课程列表→点击课程→准备录音(权限+配置)→POST session→实时转写
- 6种语言支持：en-US/zh-CN/ja-JP/ko-KR/es-ES/fr-FR
- 3种录音模式：标准/降噪/专业


## 2026-06-02 自动提取
- 项目名称：专属笔记；开发工具：Codex；阶段B已完成认证高保真页面（P01-P04）。
- P01-P04页面功能按设计稿实现，包括登录、注册、邮箱验证和忘记密码，含具体UI组件与交互逻辑（如两阶段验证、倒计时）。
- 本地开发命令与页面访问路径已确认（端口5173）。
- Auth store已实现mock登录（跳转课程页）、注册（跳转验证）、验证（进入主页）和忘记密码（状态切换）功能。


## 2026-06-02 自动提取
- 用户决定删除所有前端代码，因为改动太多导致代码混乱，选择彻底清理并重新开始
- 用户偏好代码整洁，在代码变得混乱时倾向于推倒重来
