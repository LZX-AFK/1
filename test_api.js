// test_api.js v2 — 本地验证百度+豆包 API Key
// 用法: node test_api.js

const https = require('https')
const http  = require('http')

// ========== API Key ==========
const BAIDU_API_KEY    = 'gNxbLGNpWDnCyGKgZu2LD9VC'
const BAIDU_SECRET_KEY = 'Q2Xa3LBi6vg6yNrGKhtUoAeKoJrCc3gc'
const DOUBAO_API_KEY   = 'ark-808ac3d2-8f45-4097-be25-e14404143d8d-e9d89'

// ========== 豆包模型 ID（已验证存在） ==========
const DOUBAO_TEXT_MODEL = 'doubao-seed-1-6-lite-250115'   // 文本对话
const DOUBAO_IMG_MODEL  = 'doubao-seedream-4-0-250828'   // 图像生成

// ========== 工具函数 ==========

/** 下载 URL（跟随重定向，返回 Buffer） */
function download(url, maxRedirects = 5) {
  return new Promise((resolve, reject) => {
    function attempt(currentUrl, redirectsLeft) {
      const u = new URL(currentUrl)
      const mod = u.protocol === 'https:' ? https : http
      mod.get({
        hostname: u.hostname,
        path: u.pathname + u.search,
        timeout: 30000,
        headers: { 'User-Agent': 'Mozilla/5.0' },
      }, res => {
        // 跟随重定向
        if ([301, 302, 303, 307, 308].includes(res.statusCode) && res.headers.location && redirectsLeft > 0) {
          const redirectUrl = new URL(res.headers.location, currentUrl).toString()
          return attempt(redirectUrl, redirectsLeft - 1)
        }
        if (res.statusCode !== 200) {
          return reject(new Error(`HTTP ${res.statusCode}`))
        }
        const chunks = []
        res.on('data', c => chunks.push(c))
        res.on('end', () => resolve(Buffer.concat(chunks)))
      }).on('error', reject)
    }
    attempt(url, maxRedirects)
  })
}

/** HTTPS POST form-urlencoded（百度 API 专用） */
function httpPostForm(hostname, path, params, extraHeaders = {}) {
  return new Promise((resolve, reject) => {
    const data = Object.keys(params)
      .map(k => encodeURIComponent(k) + '=' + encodeURIComponent(params[k]))
      .join('&')
    const req = https.request({
      hostname,
      path,
      method: 'POST',
      timeout: 60000,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(data),
        ...extraHeaders,
      },
    }, res => {
      let raw = ''
      res.on('data', c => raw += c)
      res.on('end', () => {
        try { resolve(JSON.parse(raw)) }
        catch (e) { resolve(raw) }
      })
    })
    req.on('error', reject)
    req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')) })
    req.write(data)
    req.end()
  })
}

/** HTTPS POST JSON（豆包 API 专用） */
function httpPostJson(hostname, path, body, extraHeaders = {}) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body)
    const req = https.request({
      hostname,
      path,
      method: 'POST',
      timeout: 60000,
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
        ...extraHeaders,
      },
    }, res => {
      let raw = ''
      res.on('data', c => raw += c)
      res.on('end', () => {
        try { resolve(JSON.parse(raw)) }
        catch (e) { resolve(raw) }
      })
    })
    req.on('error', reject)
    req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')) })
    req.write(data)
    req.end()
  })
}

// ========== 测试 1：百度 OAuth ==========
async function testBaiduOAuth() {
  console.log('\n[测试1] 百度 OAuth 认证...')
  const buf = await download(
    `https://aip.baidubce.com/oauth/2.0/token?grant_type=client_credentials&client_id=${BAIDU_API_KEY}&client_secret=${BAIDU_SECRET_KEY}`
  )
  const res = JSON.parse(buf.toString())
  if (res.access_token) {
    console.log('  ✅ 成功, token 前20位:', res.access_token.slice(0, 20) + '...')
    return res.access_token
  }
  console.log('  ❌ 失败:', JSON.stringify(res).slice(0, 300))
  return null
}

// ========== 测试 2：百度菜品识别 ==========
async function testBaiduDish(token) {
  console.log('\n[测试2] 百度菜品识别...')

  // 用一张真实可访问的食物图片
  const TEST_URLS = [
    'https://www.bing.com/th?id=OHR.BisonChicken_ZH-CN2493918854_1920x1080.jpg', // 可能不是食物
    'https://cdn.pixabay.com/photo/2017/01/11/11/33/cake-1971552_640.jpg',       // 蛋糕
    'https://cdn.pixabay.com/photo/2016/11/23/18/31/pasta-1854245_640.jpg',       // 意面
  ]

  let imageBase64 = null
  for (const url of TEST_URLS) {
    try {
      console.log(`  尝试下载: ${url.slice(0, 60)}...`)
      const buf = await download(url)
      if (buf.length > 1000) {
        imageBase64 = buf.toString('base64')
        console.log(`  ✅ 下载成功 (${buf.length} bytes)`)
        break
      }
    } catch (e) {
      console.log(`  ⚠ 下载失败: ${e.message}`)
    }
  }

  if (!imageBase64) {
    console.log('  ❌ 所有图片源均下载失败，跳过识别测试')
    console.log('  💡 手动测试：拿一张食物照片放到本项目目录，改名 test_food.jpg')
    return
  }

  console.log('  调用菜品识别 API（form-urlencoded 格式）...')
  const result = await httpPostForm(
    'aip.baidubce.com',
    `/rest/2.0/image-classify/v2/dish?access_token=${token}`,
    { image: imageBase64, top_num: '3', filter_threshold: '0.5' }
  )

  if (result && result.result && result.result.length > 0) {
    console.log('  ✅ 识别成功！')
    result.result.slice(0, 3).forEach((dish, i) => {
      console.log(`     [${i + 1}] ${dish.name} | 热量: ${dish.calorie || '?'}cal/100g | 置信度: ${((dish.probability || 0) * 100).toFixed(1)}%`)
    })
  } else if (result && result.error_code) {
    console.log(`  ❌ API 错误: code=${result.error_code}, msg=${result.error_msg}`)
  } else {
    console.log('  ❌ 返回异常:', JSON.stringify(result).slice(0, 400))
  }
}

// ========== 测试 3：豆包文本 ==========
async function testDoubaoText() {
  console.log(`\n[测试3] 豆包文本生成 (model: ${DOUBAO_TEXT_MODEL})...`)

  try {
    const result = await httpPostJson(
      'ark.cn-beijing.volces.com',
      '/api/v3/chat/completions',
      {
        model: DOUBAO_TEXT_MODEL,
        messages: [
          { role: 'system', content: '你是食物"芝士汉堡"的拟人化角色，性格活泼可爱。用第一人称说一句俏皮台词（40字以内）。' },
          { role: 'user', content: '请说一句芝士汉堡的角色台词：' },
        ],
        max_tokens: 100,
        temperature: 0.9,
      },
      { 'Authorization': `Bearer ${DOUBAO_API_KEY}` }
    )

    if (result && result.choices && result.choices[0]) {
      console.log('  ✅ 生成成功！')
      console.log('     对话:', result.choices[0].message.content.trim())
    } else if (result && result.error) {
      console.log('  ❌ 失败:', result.error.code, result.error.message)
      if (result.error.message.includes('does not exist')) {
        console.log('  💡 请在火山方舟控制台 → 开通管理 → 开通 doubao-seed-1-6-lite 模型')
      }
    } else {
      console.log('  ❌ 返回异常:', JSON.stringify(result).slice(0, 400))
    }
  } catch (e) {
    console.log('  ❌ 网络异常:', e.message)
  }
}

// ========== 测试 4：豆包生图 ==========
async function testDoubaoImage() {
  console.log(`\n[测试4] 豆包图像生成 (model: ${DOUBAO_IMG_MODEL})...`)

  try {
    const result = await httpPostJson(
      'ark.cn-beijing.volces.com',
      '/api/v3/images/generations',
      {
        model: DOUBAO_IMG_MODEL,
        prompt: 'Cute chibi cheeseburger character, kawaii Japanese anime style, soft green warm palette, white background, rounded sticker, big eyes, no text',
        n: 1,
        size: '1024x1024',
        response_format: 'url',
      },
      { 'Authorization': `Bearer ${DOUBAO_API_KEY}` }
    )

    if (result && result.data && result.data[0]) {
      const img = result.data[0]
      if (img.url) {
        console.log('  ✅ 生图成功！')
        console.log('     图片URL:', img.url)
      } else if (img.b64_json) {
        console.log('  ✅ 生图成功！（base64 格式，长度:', img.b64_json.length, '）')
      }
    } else if (result && result.error) {
      console.log('  ❌ 失败:', result.error.code, result.error.message)
      if (result.error.message.includes('does not exist')) {
        console.log('  💡 请在火山方舟控制台 → 开通管理 → 开通 doubao-seedream 模型')
      }
    } else {
      console.log('  ❌ 返回异常:', JSON.stringify(result).slice(0, 400))
    }
  } catch (e) {
    console.log('  ❌ 网络异常:', e.message)
  }
}

// ========== 主流程 ==========
async function main() {
  console.log('═══════════════════════════════════════')
  console.log('  团团食记 — API Key 本地验证 v2')
  console.log('═══════════════════════════════════════')
  console.log(`  豆包文本模型: ${DOUBAO_TEXT_MODEL}`)
  console.log(`  豆包生图模型: ${DOUBAO_IMG_MODEL}`)

  // 百度
  const token = await testBaiduOAuth()
  if (token) await testBaiduDish(token)

  // 豆包
  await testDoubaoText()
  await testDoubaoImage()

  console.log('\n═══════════════════════════════════════')
  console.log('  验证结束')
  console.log('  如果豆包模型报 NotFound：')
  console.log('  1. 打开 https://console.volcengine.com/ark/')
  console.log('  2. 左侧 → 开通管理 → 搜索并开通对应模型')
  console.log('  3. 重新运行 node test_api.js')
  console.log('═══════════════════════════════════════')
}

main().catch(e => { console.error('异常:', e); process.exit(1) })
