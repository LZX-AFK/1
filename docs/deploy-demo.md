# ClassNote-AI 部署与演示环境指南

## 一、三种运行环境

| 环境 | RUNTIME_ENV | API 地址 | 用途 |
|------|-------------|----------|------|
| 本地开发 | `local-h5` | `http://127.0.0.1:3000` | 本机浏览器 H5 开发调试 |
| 局域网测试 | `lan-test` | `http://局域网IP:3000` | 手机真机测试（同 Wi-Fi） |
| 公网演示 | `public-demo` | `https://公网地址` | APK 打包分发、异地演示 |

## 二、局域网测试方式

### 步骤

1. 确认电脑局域网 IP：
   ```
   ipconfig
   ```
   找到 Wi-Fi 适配器的 IPv4 地址，例如 `192.168.1.2`

2. 修改 `src/config/runtime.ts`：
   ```ts
   const RUNTIME_ENV: 'lan-test' = 'lan-test'
   const LAN_API_HOST = '192.168.1.2'  // 改成你的 IP
   ```

3. 后端监听 `0.0.0.0`：
   ```js
   fastify.listen({ port: 3000, host: '0.0.0.0' })
   ```

4. Windows 防火墙放行 3000 端口：
   ```powershell
   netsh advfirewall firewall add rule name="ClassNote-API" dir=in action=allow protocol=tcp localport=3000
   ```

5. 手机和电脑连接同一个 Wi-Fi

6. 前端构建或 HBuilderX 运行到手机

7. 验证：手机浏览器访问 `http://192.168.1.2:3000/health`

### 注意事项

- 手机和电脑必须在同一局域网
- 电脑 IP 可能变化（DHCP），每次测试前确认
- 此方式不适合分发给其他用户

## 三、临时公网演示（Cloudflare Tunnel / ngrok）

### Cloudflare Tunnel（推荐，免费）

1. 安装 cloudflared：
   ```
   winget install cloudflare.cloudflared
   ```

2. 启动隧道：
   ```
   cloudflared tunnel --url http://localhost:3000
   ```

3. 输出类似：
   ```
   Your quick Tunnel has been created! Visit it at:
   https://xxxx-xxxx.trycloudflare.com
   ```

4. 修改 `src/config/runtime.ts`：
   ```ts
   const RUNTIME_ENV = 'public-demo'
   const PUBLIC_API_HOST = 'xxxx-xxxx.trycloudflare.com'
   const PUBLIC_API_PORT = ''  // Cloudflare Tunnel 默认 443
   ```

5. 重新构建前端

### ngrok

1. 安装 ngrok 并配置 authtoken

2. 启动隧道：
   ```
   ngrok http 3000
   ```

3. 获取公网地址（如 `xxxx.ngrok-free.app`），配置到 `PUBLIC_API_HOST`

### 注意事项

- Cloudflare Tunnel / ngrok 生成的地址每次启动会变化
- 仅适合临时演示，不适合长期使用
- WebSocket 支持：Cloudflare Tunnel 原生支持 WSS

## 四、正式部署（Railway / Render / Zeabur）

### Railway（推荐）

1. 注册 [Railway](https://railway.app)
2. New Project → Deploy from GitHub repo
3. 选择后端仓库 `oleap-rail-clean`
4. 设置环境变量：
   ```
   DASHSCOPE_API_KEY=sk-xxx
   DEEPSEEK_API_KEY=sk-xxx
   DATABASE_URL=file:./data/classnote.db
   PORT=3000
   ```
5. 部署完成后获取公网地址（如 `classnote-api.up.railway.app`）

### Render

1. 注册 [Render](https://render.com)
2. New → Web Service
3. 连接 GitHub 仓库
4. Build Command: `npm install`
5. Start Command: `npm start`
6. 设置环境变量同上

### Zeabur

1. 注册 [Zeabur](https://zeabur.com)
2. 创建项目 → 部署 Git 服务
3. 配置环境变量
4. 绑定自定义域名（可选）

### 部署后配置前端

修改 `src/config/runtime.ts`：
```ts
const RUNTIME_ENV = 'public-demo'
const PUBLIC_API_HOST = 'classnote-api.up.railway.app'  // 替换为你的地址
const PUBLIC_API_PORT = ''  // Railway/Render 默认 443
```

## 五、APK 打包配置

### 打包前检查清单

1. `src/config/runtime.ts`：
   - `RUNTIME_ENV` = `'public-demo'`
   - `PUBLIC_API_HOST` = 公网后端地址（不含 `https://`）
   - `PUBLIC_API_PORT` = `''`（标准 443 端口留空）

2. 后端已部署并运行：
   - `https://你的地址/health` 返回 `{"status":"ok"}`

3. WebSocket 可达：
   - `wss://你的地址/ws/...` 可以连接

4. 设置页显示：
   - 当前环境：公网演示
   - API 地址：`https://你的地址`
   - 后端连接：正常

### HBuilderX 打包

1. 发行 → 原生App-云打包
2. 选择 Android
3. 勾选"使用公共测试证书"（测试用）
4. 打包完成后安装 APK

### CLI 打包

```bash
npx uni build -p app
```

## 六、WebSocket 配置注意

- **公网必须使用 `wss://`**（WebSocket Secure）
- Cloudflare Tunnel / Railway / Render 自动提供 TLS，WSS 直接可用
- 如果自建 Nginx 反向代理，需要配置 WebSocket 升级：
  ```nginx
  location /ws/ {
      proxy_pass http://127.0.0.1:3000;
      proxy_http_version 1.1;
      proxy_set_header Upgrade $http_upgrade;
      proxy_set_header Connection "upgrade";
  }
  ```

## 七、后端环境变量

| 变量 | 说明 | 必填 |
|------|------|------|
| `DASHSCOPE_API_KEY` | 阿里云 DashScope（ASR 语音识别） | 是 |
| `DEEPSEEK_API_KEY` | DeepSeek（AI 总结生成） | 是 |
| `DATABASE_URL` | SQLite 数据库路径 | 否（默认 `file:./data/classnote.db`） |
| `PORT` | 监听端口 | 否（默认 3000） |

## 八、故障排查

| 现象 | 可能原因 | 解决方案 |
|------|----------|----------|
| 知识库加载失败（lan-test） | 手机和电脑不在同一 Wi-Fi | 确认连接同一网络 |
| 知识库加载失败（public-demo） | 后端服务未启动或地址错误 | 检查 `https://地址/health` |
| WebSocket 连接失败 | 未使用 wss:// | 确认 `WS_BASE_URL` 以 `wss://` 开头 |
| ASR 识别失败 | DashScope API Key 无效 | 检查后端环境变量 |
| DeepSeek 总结失败 | API Key 无效或余额不足 | 检查后端日志 |
| APK 打包后无法连接 | 仍使用局域网地址 | 确认 `RUNTIME_ENV = 'public-demo'` |
