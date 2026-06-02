# ClassNote AI — 阶段6 联调 & E2E 自查清单

## 联调前准备

### 1. 替换后端地址（只改一处）

打开 `utils/config.ts`：

```ts
// 本地联调：ENV = 'dev'（默认，后端跑在 localhost:3000）
const ENV: Env = 'dev'

// 生产部署：ENV = 'prod'，然后填入 Railway/Render 的真实地址
prod: {
  apiBase: 'https://your-app.railway.app', // ← 改这里
  wsHost: 'your-app.railway.app',          // ← 改这里
  wsProtocol: 'wss',
},
```

### 2. 后端启动确认

```bash
cd oleap-fastify-demo
cp .env.example .env   # 填入 DEEPGRAM_API_KEY / OPENAI_API_KEY
npm install
npm run dev            # 监听 localhost:3000
```

访问 `http://localhost:3000/health` → 返回 `{ status: "ok" }` 即就绪。

---

## E2E 全链路自查（逐条打勾）

### 一、页面跳转

- [ ] P05 课程页正常显示 demo 课程卡片
- [ ] 点击「开始新课堂」跳转到 P11 准备录音页
- [ ] P11 点击「开始实时录音」弹出麦克风权限弹窗
- [ ] 授权后调用 `POST /api/sessions` 成功，控制台打印 sessionId
- [ ] 跳转到 P12 实时录音页，计时器开始走

### 二、实时转写核心链路

- [ ] P12 页面 WebSocket 连接成功（控制台无 `connect failed` 报错）
- [ ] 对手机说话，后端日志出现 Deepgram transcript 片段
- [ ] P12 字幕区域实时出字（`liveText` 灰色在跳动）
- [ ] isFinal=true 时字幕变为确认黑色文字并锁定
- [ ] 字幕区域自动滚动到最新一条

### 三、时间轴标记

- [ ] 点击「❓ 没懂」按钮，触发 `POST /api/sessions/:id/markers`
- [ ] 接口返回 markerId，控制台无报错
- [ ] 时间轴横条上出现对应颜色圆点
- [ ] 重复打 3 种不同标记，圆点颜色各不同

### 四、结束课堂 & AI 总结

- [ ] 点击「结束」，二次确认弹窗出现
- [ ] 确认后调用 `PATCH /api/sessions/:id/end`，接口返回 `{ status: "summarizing" }`
- [ ] 跳转到 P15 总结页，显示「AI 正在生成总结」loading 骨架屏
- [ ] 轮询 `GET /api/sessions/:id/summary`，status 变为 `done` 后加载内容
- [ ] 总结页显示：课堂概览 / 核心知识点 / 标记疑问卡片（每个标记对应一张）

### 五、时间轴标记页

- [ ] 从总结页跳转 P13，标记列表正常加载
- [ ] Tab 筛选「疑问/重点/考点」各 Tab 切换正常
- [ ] 点击「回放」按钮，音频跳到对应时间点播放

### 六、异常场景

- [ ] **WS 断线重连**：在 P12 录音中，手动关闭 WiFi 再开启，WS 自动重连，字幕恢复
- [ ] **后端 API 超时**：关掉后端进程，前端出现 Toast 提示而不是白屏
- [ ] **权限拒绝**：拒绝麦克风权限，出现「请在设置中开启」引导弹窗
- [ ] **总结超时**：AI 30 次轮询（约 90s）未完成，出现超时提示

---

## APK 打包（HBuilderX 云打包）

### 步骤

1. HBuilderX 菜单：`发行` → `原生App-云打包`
2. 选择 **Android** 平台
3. 证书选择：
   - 测试包：使用「公共测试证书」（无需自备）
   - 正式包：上传自己的 keystore 文件
4. 勾选「生成 APK」（不勾 AAB，方便直接安装）
5. 点击「打包」，等待约 3-5 分钟
6. 下载 APK → 发给种子用户安装测试

### manifest.json 检查

打包前确认 `manifest.json` 里以下字段已填：

```json
{
  "name": "ClassNote AI",
  "appid": "__UNI__XXXXXX",      // HBuilderX 自动分配，不要改
  "versionName": "1.0.0",
  "versionCode": "100",
  "app-plus": {
    "permissions": [
      "android.permission.RECORD_AUDIO",    // 录音
      "android.permission.INTERNET",        // 网络
      "android.permission.WRITE_EXTERNAL_STORAGE",  // 文件
      "android.permission.CAMERA"           // 拍照上传错题
    ]
  }
}
```

---

## 推送到 GitHub

全部联调通过后：

```bash
cd "D:\新建文件夹"
git add projects/proj-1780368826860-qqwlkp
git commit -m "feat: 阶段6联调完成，URL统一配置，E2E通过"
git push
```
