# Phase 3 真机交互验收记录

测试时间：2026-06-04 13:12  
测试设备：Redmi 24129RT7CC / Android 真机 / HBuilderX 标准基座  
运行方式：`npm run build:app` 后通过 ADB 推送到 `io.dcloud.HBuilder` 基座运行

## 本轮结论

主应用资源已能在真机基座中启动，不再出现 HBuilderX 默认占位页。首页、课程、知识库、我的、录音准备、实时转写、AI 总结等主要页面可以渲染。

录音主链路已重新验证为可通：录音准备 → 实时转写 → 结束课堂 → AI 总结。上一版记录中把“结束课堂”误判为未触发，是测试点击坐标没有命中按钮导致，现已更正。

当前主要问题集中在视觉与文案质量：TabBar 图标在真机上显示为绿色色块，部分 i18n key 未解析，顶部安全区容易被系统通知覆盖。这些不阻断主流程，但会影响 Phase 4 视觉精修前的体验基线。

## P1 / P2 问题

| 编号 | 等级 | 模块 | 实测结果 | 证据 |
| --- | --- | --- | --- | --- |
| P3-001 | P2 | TabBar | TabBar 功能可切换，但图标资源在真机显示为绿色块，视觉上不可接受。 | `phase3-courses-list4.png`, `phase3-knowledge-list4.png`, `phase3-profile-final.png` |
| P3-002 | P2 | 课程详情 / AI 总结 | 部分 i18n key 未解析，出现 `{term}`、`Week {week}`、`common.summary`、`{course}`、`{date}` 等裸 key。 | `phase3-course-detail3.png`, `phase3-record-entry-retest.png` |
| P3-003 | P2 | 安全区 / 系统遮挡 | 多个页面顶部内容容易被系统时间、USB 调试通知、微信通知覆盖；需要补安全区和真机通知遮挡场景的视觉余量。 | `phase3-profile-final.png`, `phase3-relaunch.png` |
| P3-004 | P2 | 实时转写返回 | 实时转写中系统返回策略还需明确：当前返回后会保留 recording session，用户可能误以为已退出录音。 | `phase3-live-top-end-confirm2.png` |

## 已通过项目

| 模块 | 验收点 | 实测结果 | 证据 |
| --- | --- | --- | --- |
| App 基座 | 真机可打开应用资源 | 通过，启动后进入 ClearNote 首页，不再显示 HBuilderX 默认占位页。 | `phase3-relaunch.png` |
| TabBar | 课程 Tab 点击 | 通过，命中正确坐标后进入课程列表页。 | `phase3-courses-list4.png` |
| TabBar | 知识库 Tab 点击 | 通过，进入知识库首页。 | `phase3-knowledge-list4.png` |
| TabBar | 我的 Tab 点击 | 通过，进入个人页。 | `phase3-profile-final.png` |
| 首页 | 今日课程、开始课堂录音、最近笔记 | 通过，首页内容可正常渲染，点击录音入口可进入录音准备页。 | `phase3-relaunch.png` |
| 录音准备 | 页面内容 | 通过，显示设备状态、课堂信息、语言设置、录音设置和开始录音按钮。 | `phase3-record-bottom2.png` |
| 录音准备 | 点击开始录音 | 通过，可进入实时转写页。 | `phase3-live-2s.png` |
| 实时转写 | 计时器运行 | 通过，计时器持续增长。 | `phase3-now.png` |
| 实时转写 | 转写段落逐段出现 | 通过，多段 mock transcript 正常显示并高亮当前段落。 | `phase3-live-6s.png` |
| 实时转写 | 暂停 / 继续 | 通过，暂停后红点变灰、波形变暗、按钮变为“继续”；再次点击可恢复。 | `phase3-live-paused.png`, `phase3-live-resumed.png` |
| 实时转写 | 标记按钮 | 通过，点击标记后出现“已添加标记” Toast。 | `phase3-live-marker-toast.png` |
| 实时转写 | 时间轴按钮 | 通过，可打开底部时间轴，并显示已添加标记。 | `phase3-live-timeline.png` |
| 实时转写 | 结束课堂进入 AI 总结 | 通过。重新命中结束按钮后，已进入 AI 总结页。 | `phase3-record-entry-retest.png` |
| AI 总结 | 页面正常显示 | 通过，显示 Hero 卡片、Tab 区、总览内容、今日复习任务。 | `phase3-record-entry-retest.png` |
| 课程 | 课程列表 | 通过，列表、搜索框、筛选 Tab、课程卡片和待复习区域可显示。 | `phase3-courses-list4.png` |
| 课程 | 课程详情 | 通过，课程详情页可进入，录音 Tab 列表可显示。 | `phase3-course-detail3.png` |
| 知识库 | 知识库首页 | 通过，搜索、学习进步概览、课程学习空间列表可显示。 | `phase3-knowledge-list4.png` |
| 我的 | 个人页 | 通过，Hero、学习档案、课程个性化、语言区域可显示。 | `phase3-profile-final.png` |

## 待补测项目

| 模块 | 待补测点 | 原因 |
| --- | --- | --- |
| AI 总结 | 7 个 Tab 切换、复制、导出、保存、完成返回首页 | 本轮已确认页面可达和总览显示，还需继续补交互细项。 |
| 课程详情 | 播放、转写文本、AI 总结按钮、错题、复习任务勾选 | 本轮只确认详情页可达和基础内容渲染。 |
| 知识库课程详情 | 课堂、知识点、复习 Tab 切换 | 本轮确认知识库首页可达，详情交互需继续补测。 |
| 我的页 | 语言 ActionSheet、学习档案保存、标签切换 | 本轮只确认页面可达和主要区块渲染。 |
| 异常状态 | Loading、错误、空态、快速连续点击 | 需要专门构造 store/mock 状态再测。 |

## 建议修复顺序

1. 修复 TabBar 图标资源，避免 App 真机显示绿色块。
2. 补齐 i18n 缺失 key，尤其是课程详情和 AI 总结里的 `{term}`、`Week {week}`、`common.summary`、`{course}`、`{date}` 等。
3. 统一页面顶部安全区策略，避免被状态栏和系统通知遮挡核心标题。
4. 明确实时转写系统返回策略：继续录音、暂停录音、确认退出三选一，不要让用户误以为已经结束课堂。
5. 继续补测 AI 总结、课程详情、知识库详情、我的页里的二级交互。
