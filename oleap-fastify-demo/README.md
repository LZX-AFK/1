# Oleap Fastify Demo

这是给 `oleap-uniapp-demo` 配套使用的课堂后端 starter。它的目标不是一次性做完整生产后端，而是帮助学生跑通：

```text
Oleap 耳机录音 -> uni-app 拿到 filePath -> Fastify 后端 -> mock 转写/摘要/翻译/分析 -> App 展示
```

## 1. 安装与启动

```sh
npm install
npm run ip
npm run dev
```

启动后本机可以访问：

```text
http://127.0.0.1:3000/health
```

手机真机访问时不要写 `localhost`，要写电脑的局域网 IP，例如：

```text
http://192.168.2.118:3000/health
```

本项目建议使用 Node.js 20 或更新版本。可以用下面命令检查：

```sh
node -v
```

## 2. 为什么 listen host 要用 0.0.0.0

本项目默认使用：

```js
await app.listen({
  port: 3000,
  host: '0.0.0.0'
})
```

这样同一个 WiFi 下的手机才能访问你电脑上启动的后端。  
如果只监听 `localhost`，手机访问不到。

## 3. 环境变量

可以复制 `.env.example` 为 `.env`：

```sh
cp .env.example .env
```

常用配置：

```env
HOST=0.0.0.0
PORT=3000
PUBLIC_BASE_URL=http://192.168.2.118:3000
UPLOAD_DIR=uploads/audio
MAX_FILE_SIZE_MB=80
```

`PUBLIC_BASE_URL` 用于生成上传文件的访问地址。课堂上可以改成教师或学生电脑的局域网 IP。

## 4. 接口列表

### GET /health

检查后端是否启动。

```sh
curl http://127.0.0.1:3000/health
```

### POST /api/transcript/mock

返回一段模拟转写结果。

```sh
curl -X POST http://127.0.0.1:3000/api/transcript/mock \
  -H "Content-Type: application/json" \
  -d '{"topic":"语音知识库系统","scene":"classroom"}'
```

### POST /api/ai/process

根据命题返回 mock 摘要、关键词、建议等结果，并保存到本地记录。

```sh
curl -X POST http://127.0.0.1:3000/api/ai/process \
  -H "Content-Type: application/json" \
  -d '{"topic":"语音知识库系统","filePath":"/mock/audio.wav"}'
```

### POST /api/audio/upload

接收 uni-app 的 `uni.uploadFile` 上传。字段名必须是 `audio`。

```js
uni.uploadFile({
  url: 'http://192.168.2.118:3000/api/audio/upload',
  filePath: this.filePath,
  name: 'audio',
  formData: {
    topic: '语音知识库系统',
    scene: 'classroom'
  },
  success: (res) => {
    const body = JSON.parse(res.data)
    console.log(body.data.result.summary)
  }
})
```

### GET /api/records

查看本地保存的课堂记录。

```sh
curl http://127.0.0.1:3000/api/records
```

## 5. 手把手：仿照新增一个接口

下面用一个很小的例子演示如何新增接口。  
目标：新增一个“课堂提醒”接口，让前端传入课程名，后端返回一条提醒文案。

最终接口：

```text
POST /api/reminder/create
```

请求示例：

```json
{
  "course": "移动应用开发",
  "task": "完成语音知识库页面"
}
```

返回示例：

```json
{
  "ok": true,
  "data": {
    "course": "移动应用开发",
    "task": "完成语音知识库页面",
    "message": "请在移动应用开发课后完成：完成语音知识库页面",
    "createdAt": "2026-05-24T02:00:00.000Z"
  }
}
```

### 第 1 步：新建路由文件

在 `src/routes/` 目录下新建文件：

```text
src/routes/reminder.js
```

写入：

```js
export async function reminderRoutes(app) {
  app.post('/create', async (request) => {
    const body = request.body || {}
    const course = body.course || '未命名课程'
    const task = body.task || '完成课堂练习'

    return {
      ok: true,
      data: {
        course,
        task,
        message: `请在${course}课后完成：${task}`,
        createdAt: new Date().toISOString()
      }
    }
  })
}
```

这段代码里最重要的是：

- `reminderRoutes(app)`：导出一个路由注册函数。
- `app.post('/create', ...)`：定义一个 POST 接口。
- `request.body`：读取前端传来的 JSON。
- `return {...}`：Fastify 会自动把对象返回成 JSON。

### 第 2 步：在 app.js 里注册路由

打开：

```text
src/app.js
```

在顶部加入 import：

```js
import { reminderRoutes } from './routes/reminder.js'
```

然后在已有 `app.register(...)` 附近加入：

```js
await app.register(reminderRoutes, { prefix: '/api/reminder' })
```

为什么最终路径是 `/api/reminder/create`？

```text
prefix: /api/reminder
路由:   /create
最终:   /api/reminder/create
```

### 第 3 步：重启并测试

如果正在运行 `npm run dev`，保存文件后一般会自动重启。  
然后在终端测试：

```sh
curl -X POST http://127.0.0.1:3000/api/reminder/create \
  -H "Content-Type: application/json" \
  -d '{"course":"移动应用开发","task":"完成语音知识库页面"}'
```

如果看到 `ok: true`，说明接口已经成功。

手机真机测试时，把地址换成电脑局域网 IP：

```text
http://192.168.2.118:3000/api/reminder/create
```

### 第 4 步：uni-app 里调用这个接口

```js
const API_BASE_URL = 'http://192.168.2.118:3000'

uni.request({
  url: `${API_BASE_URL}/api/reminder/create`,
  method: 'POST',
  data: {
    course: '移动应用开发',
    task: '完成语音知识库页面'
  },
  success: (res) => {
    console.log('提醒结果', res.data.data.message)
  },
  fail: (error) => {
    console.log('请求失败', error)
  }
})
```

### 第 5 步：照这个模式做自己的业务接口

学生做不同命题时，可以仿照上面的结构新增接口：

| 命题方向 | 可以新增的接口 | 作用 |
| --- | --- | --- |
| 语音知识库系统 | `POST /api/knowledge/create` | 把转写文本整理成知识点 |
| 语音翻译助手 | `POST /api/translate/create` | 返回双语对照结果 |
| 语音内容生成工具 | `POST /api/content/generate` | 生成文章、脚本或文案 |
| 语音客服 / 销售助手 | `POST /api/sales/analyze` | 生成客户需求和跟进计划 |
| 语音情绪分析工具 | `POST /api/emotion/analyze` | 返回情绪标签和图表数据 |

新增接口时记住 4 件事：

```text
1. 在 src/routes/ 新建一个路由文件
2. 在 src/app.js 里 import 并 app.register
3. 用 curl 或手机浏览器先测试后端
4. 再用 uni.request 或 uni.uploadFile 接到 App 页面
```

## 6. uni-app 调用示例

先用 `uni.request` 跑通，不急着上传音频：

```js
const API_BASE_URL = 'http://192.168.2.118:3000'

uni.request({
  url: `${API_BASE_URL}/api/ai/process`,
  method: 'POST',
  data: {
    topic: '语音知识库系统',
    filePath: this.filePath
  },
  success: (res) => {
    const result = res.data.data
    this.transcript = result.transcript.text
    this.summary = result.summary
    this.keywords = result.keywords
  }
})
```

再用 `uni.uploadFile` 上传 Oleap 录音文件：

```js
uni.uploadFile({
  url: `${API_BASE_URL}/api/audio/upload`,
  filePath: this.filePath,
  name: 'audio',
  formData: {
    topic: '语音知识库系统',
    scene: 'classroom'
  },
  success: (res) => {
    const body = JSON.parse(res.data)
    const result = body.data.result
    this.transcript = result.transcript.text
    this.summary = result.summary
    this.keywords = result.keywords
  }
})
```

## 7. 课堂排错

- 手机访问电脑后端时，不要写 `localhost`。
- Fastify 必须监听 `0.0.0.0`。
- 电脑和手机必须在同一个 WiFi。
- 学校 WiFi 如果开启客户端隔离，手机可能访问不到电脑，可以改用手机热点。
- Windows 防火墙要允许 Node.js 访问专用/公用网络。
- 先用手机浏览器打开 `/health`，能打开再写 uni-app 请求。

## 8. 推荐课堂节奏

上午先跑通 uni-app 真机录音，拿到 `audio.filePath`。  
下午先用 `/api/ai/process` 跑通 App 调后端，再用 `/api/audio/upload` 做真实文件上传。
