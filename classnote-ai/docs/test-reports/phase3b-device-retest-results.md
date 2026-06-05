# Phase 3-B 真机定向复测记录

测试时间：2026-06-04 16:36  
测试设备：Redmi 24129RT7CC / Android 真机 / HBuilderX 标准基座  
测试包：执行 `npm run build:app` 后推送 `dist/build/app` 到 `io.dcloud.HBuilder` 标准基座  
构建结果：通过

## 复测结论

本轮验证到最新包可以正常启动，实时转写系统返回拦截已生效，按系统返回会弹出“离开实时转写？”确认弹窗，“继续录音”按钮可正常关闭弹窗并继续停留在实时转写页。

但 TabBar 图标绿色块问题仍存在，录音准备页标题仍与系统状态栏区域发生明显遮挡，实时转写“放弃并返回”按钮本轮未能完成预期返回动作。用户手动命中“结束课堂”后，结束确认 → AI 总结链路可通；进入 AI 总结后发现 Hero 与复习 Tab 仍存在裸占位符。

## 复测明细

| 编号 | 模块 | 实测结果 | 是否通过 | 证据 |
| --- | --- | --- | --- | --- |
| 1.1 | 底部 TabBar | 启动 App 后底部 5 个 Tab 仍显示绿色色块，未显示预期 emoji 图标。 | 否 | `phase3b-01-home.png` |
| 1.2 | 底部 TabBar | 点击知识库 Tab 后，知识库图标区域仍为绿色色块，未显示 📒。 | 否 | `phase3b-02-knowledge-tab.png` |
| 1.3 | 底部 TabBar | 中间录音按钮区域仍显示绿色色块，未显示 🎙。 | 否 | `phase3b-03-record-tab.png` |
| 1.4 | 底部 TabBar | 未完成英文语言切换后的复测。 | 未测 | - |
| 2.1 | 课程详情 | 未完成。尝试切换课程详情时误进入实时转写流程，后续优先执行返回策略复测。 | 未测 | - |
| 2.2 | 课程详情 | 未完成。 | 未测 | - |
| 2.3 | AI 总结 | 结束课堂进入 AI 总结页后，Hero 顶部仍显示 `{course}`、`{date}`、`{duration}`、`{marks}` 等裸占位符。 | 否 | `phase3b-manual-summary-review2.png` |
| 2.4 | AI 总结 | 复习 Tab 中“预计耗时”仍显示 `{minutes}`，完成率仍显示 `{rate}` 裸占位符。 | 否 | `phase3b-manual-summary-review2.png` |
| 2.5 | AI 总结 | 复习 Tab 底部按钮仍显示“开始 {minutes} 分钟复习”。 | 否 | `phase3b-manual-summary-review2.png` |
| 3.1 | 首页 | 首页问候语与状态栏之间有安全距离，未被系统状态栏直接切割。 | 是 | `phase3b-01-home.png` |
| 3.2 | 首页 | USB 调试通知本轮未覆盖首页问候语；但通知条会覆盖页面中上部内容。 | 通过但需观察 | `phase3b-01-home.png` |
| 3.3 | 课程列表 | 未完成稳定截图。 | 未测 | - |
| 3.4 | 录音准备 | “录音准备”标题与系统时间/状态栏发生明显重叠，安全区仍不够。 | 否 | `phase3b-03-record-tab.png`, `phase3b-04-course-detail-retry.png` |
| 3.5 | 知识库首页 | 知识库标题与系统状态栏未明显重叠。 | 是 | `phase3b-02-knowledge-tab.png` |
| 3.6 | 我的页 | 本轮未复测。 | 未测 | - |
| 3.7 | 横屏/异形屏 | 本轮仅测 Android 真机竖屏，未测 iOS 刘海屏/横屏。 | 未测 | - |
| 4.1 | 实时转写返回策略 | 实时转写页按系统返回后，弹出“离开实时转写？”确认弹窗，文案为“当前录音仍在进行，离开可能丢失本次记录。” | 是 | `phase3b-06-live-back-confirm.png` |
| 4.2 | 实时转写返回策略 | 点击“继续录音”后弹窗关闭，留在实时转写页，录音页面继续显示。 | 是 | `phase3b-07-live-continue.png` |
| 4.3 | 实时转写返回策略 | 再次按返回后弹窗可再次出现；但点击“放弃并返回”未回到录音准备页，弹窗未完成预期返回动作。 | 否 | `phase3b-08-live-back-confirm-again.png`, `phase3b-12-live-abandon-third.png` |
| 4.4 | 实时转写返回策略 | 未完成 Home 键切后台/回前台复测。 | 未测 | - |
| 4.5 | 实时转写返回策略 | 未完成“结束确认显示时按系统返回”复测。 | 未测 | - |
| 4.6 | 实时转写返回策略 | 因 4.3 未通过，未继续复测重新进入实时转写。 | 未测 | - |
| 4.7 | 实时转写主流程 | 用户手动命中结束按钮后，结束确认弹窗出现；点击确认后进入 ProcessingOverlay，并最终进入 AI 总结页。链路可通，但按钮热区对自动化点击不友好。 | 是 | `phase3b-manual-end-current.png`, `phase3b-manual-processing.png`, `phase3b-manual-summary.png` |

## 当前需要优先处理

1. TabBar 图标仍是绿色块：需要检查实际渲染源是否仍来自自定义 TabBar 的静态图片/样式块，而不是 emoji 文本。
2. 录音准备页安全区仍不够：标题与系统时间明显重叠，需要继续加顶部安全距离或统一导航组件。
3. “放弃并返回”未按预期返回：右侧“继续录音”可用，左侧按钮行为需要排查事件绑定、层级遮挡或点击穿透。
4. AI 总结仍有裸占位符：Hero 的 `{course}`、`{date}`、`{duration}`、`{marks}`，以及复习 Tab 的 `{minutes}`、`{rate}` 仍未替换。
5. 结束课堂按钮热区对 ADB 自动化点击不友好：用户手动可命中并跑通链路，建议扩大 `.bottom-bar__center` / stop button 的可点击区域。

## 本轮截图证据

- `phase3b-01-home.png`
- `phase3b-02-knowledge-tab.png`
- `phase3b-03-record-tab.png`
- `phase3b-06-live-back-confirm.png`
- `phase3b-07-live-continue.png`
- `phase3b-08-live-back-confirm-again.png`
- `phase3b-12-live-abandon-third.png`
- `phase3b-13-end-confirm.png`
- `phase3b-14-end-confirm-2.png`
- `phase3b-manual-end-current.png`
- `phase3b-manual-processing.png`
- `phase3b-manual-summary.png`
- `phase3b-manual-summary-review2.png`
