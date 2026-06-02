// cloudfunctions/identify/index.js
// 云函数：AI 食物识别
// 输入: { imageFileID: string }
// 输出: { name, calories_per_100g, fat_ratio, protein_ratio, carb_ratio, category }
// 或降级: { recognized: false }

const cloud = require('wx-server-sdk')
const https = require('https')
const http = require('http')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

// ========== 配置（从环境变量读取） ==========
const BAIDU_API_KEY    = process.env.BAIDU_API_KEY    || ''
const BAIDU_SECRET_KEY = process.env.BAIDU_SECRET_KEY || ''

// ========== 百度 API 常量 ==========
const BAIDU_OAUTH_URL = 'aip.baidubce.com'
const BAIDU_DISH_URL  = 'aip.baidubce.com'

// ========== 工具函数 ==========

/**
 * HTTP(S) GET 请求封装
 */
function httpGet(urlPath, params = {}) {
  return new Promise((resolve, reject) => {
    const query = Object.keys(params)
      .map(k => encodeURIComponent(k) + '=' + encodeURIComponent(params[k]))
      .join('&')
    const fullPath = query ? `${urlPath}?${query}` : urlPath

    const opts = {
      hostname: new URL(`https://${urlPath}`).hostname || urlPath.split('/')[0],
      path:   '/' + fullPath.split('/').slice(1).join('/') + (query ? `?${query}` : ''),
      method: 'GET',
      timeout: 15000,
    }
    // 修正：直接使用完整 URL
    const url = `https://${fullPath}`
    const parsedUrl = new URL(url)

    const req = https.request({
      hostname: parsedUrl.hostname,
      path:     parsedUrl.pathname + parsedUrl.search,
      method:   'GET',
      timeout:  15000,
    }, res => {
      let body = ''
      res.on('data', chunk => body += chunk)
      res.on('end', () => {
        try { resolve(JSON.parse(body)) }
        catch (e) { resolve(body) }
      })
    })
    req.on('error', reject)
    req.on('timeout', () => { req.destroy(); reject(new Error('Baidu OAuth timeout')) })
    req.end()
  })
}

/**
 * HTTP(S) POST form-urlencoded（百度 API 专用）
 */
function httpPostForm(hostname, path, params) {
  return new Promise((resolve, reject) => {
    const data = Object.keys(params)
      .map(k => encodeURIComponent(k) + '=' + encodeURIComponent(params[k]))
      .join('&')
    const req = https.request({
      hostname,
      path,
      method:  'POST',
      timeout: 30000,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(data),
      },
    }, res => {
      let raw = ''
      res.on('data', chunk => raw += chunk)
      res.on('end', () => {
        try { resolve(JSON.parse(raw)) }
        catch (e) { resolve(raw) }
      })
    })
    req.on('error', reject)
    req.on('timeout', () => { req.destroy(); reject(new Error('Baidu API timeout')) })
    req.write(data)
    req.end()
  })
}

// ========== 核心逻辑 ==========

/**
 * 获取百度 access_token
 */
async function getBaiduToken() {
  const url = `https://${BAIDU_OAUTH_URL}/oauth/2.0/token`
  const res = await httpGet(url, {
    grant_type:    'client_credentials',
    client_id:     BAIDU_API_KEY,
    client_secret: BAIDU_SECRET_KEY,
  })
  if (!res || !res.access_token) {
    throw new Error('Failed to get Baidu access_token: ' + JSON.stringify(res))
  }
  return res.access_token
}

/**
 * 调用百度菜品识别 API
 */
async function callBaiduDishRecognition(accessToken, imageBase64, retryCount = 0) {
  const MAX_RETRIES = 1 // B03: 重试 1 次

  try {
    const result = await httpPostForm(
      BAIDU_DISH_URL,
      `/rest/2.0/image-classify/v2/dish?access_token=${accessToken}`,
      {
        image: imageBase64,
        top_num: '1',           // 只取最匹配的一个结果
        filter_threshold: '0.7', // 置信度阈值
        baike_num: '0',         // 不需要百科信息
      }
    )

    // B03: 格式异常检查
    if (!result || result.error_code) {
      const errMsg = result ? result.error_msg || 'unknown' : 'empty response'
      console.warn(`[identify] Baidu API error: code=${result?.error_code}, msg=${errMsg}`)

      if (retryCount < MAX_RETRIES) {
        console.log(`[identify] Retrying... (${retryCount + 1}/${MAX_RETRIES})`)
        return callBaiduDishRecognition(accessToken, imageBase64, retryCount + 1)
      }
      // B04: 降级 — 识别失败
      return null
    }

    return result
  } catch (err) {
    console.error(`[identify] Network/parse error: ${err.message}`)
    if (retryCount < MAX_RETRIES) {
      return callBaiduDishRecognition(accessToken, imageBase64, retryCount + 1)
    }
    return null
  }
}

/**
 * 解析百度返回结果为统一格式
 */
function parseBaiduResult(baiduResult) {
  if (!baiduResult || !baiduResult.result || !baiduResult.result[0]) {
    return null
  }

  const dish = baiduResult.result[0]

  // 热量换算：百度返回 cal/100g，默认按中份 250g 估算
  const PORTION_GRAMS = 250 // 中份默认克重（前端可覆盖）
  const caloriesPer100g = dish.calorie ? parseFloat(dish.calorie) : 0
  const totalCalories = Math.round(caloriesPer100g * PORTION_GRAMS / 100)

  return {
    name:              dish.name || '未知食物',
    calories_per_100g: caloriesPer100g,
    estimated_portion_g: PORTION_GRAMS,
    estimated_calories:  totalCalories,      // 估算总热量
    fat_ratio:         0,                      // 百度菜品 API 可能不直接返回
    protein_ratio:     0,                      // 这些字段需后续由豆包补充
    carb_ratio:        0,
    category:          mapCategory(dish.name),
    confidence:        dish.probability || 0,
    raw_name:          dish.name,
  }
}

/**
 * 食物名称 → 类别映射（20 大类）
 */
function mapCategory(foodName) {
  const name = (foodName || '').toLowerCase()
  const map = [
    ['汉堡', 'burger'], ['三明治', 'burger'], ['热狗', 'burger'],
    ['炸鸡', 'fried'],  ['薯条', 'fried'],  ['油条', 'fried'],
    ['披萨', 'pizza'],  ['意面', 'pizza'],  ['意大利面', 'pizza'],
    ['寿司', 'sushi'],  ['刺身', 'sushi'],  ['日料', 'sushi'],
    ['火锅', 'hotpot'], ['麻辣烫', 'hotpot'], ['冒菜', 'hotpot'],
    ['奶茶', 'milk_tea'], ['咖啡', 'milk_tea'], ['饮料', 'milk_tea'],
    ['蛋糕', 'dessert'], ['冰淇淋', 'dessert'], ['甜点', 'dessert'],
    ['沙拉', 'salad'],  ['轻食', 'salad'],
    ['饼干', 'snack'],  ['薯片', 'snack'],  ['坚果', 'snack'],
    ['粥', 'congee'],   ['稀饭', 'congee'],
    ['米饭', 'staple'], ['馒头', 'staple'], ['面包', 'staple'],
    ['面条', 'noodle'], ['拉面', 'noodle'], ['米线', 'noodle'],
    ['鸡肉', 'meat'],   ['牛肉', 'meat'],   ['猪肉', 'meat'], ['排骨', 'meat'],
    ['鱼', 'seafood'],  ['虾', 'seafood'],  ['蟹', 'seafood'], ['贝', 'seafood'],
    ['蛋', 'egg'],      ['鸡蛋', 'egg'],
    ['豆腐', 'tofu'],   ['豆浆', 'tofu'],   ['豆皮', 'tofu'],
    ['蔬菜', 'vegetable'], ['青菜', 'vegetable'],
    ['水果', 'fruit'],
    ['汤', 'soup'],
  ]
  for (const [keyword, category] of map) {
    if (name.includes(keyword)) return category
  }
  return 'other'
}

// ========== 主入口 ==========
exports.main = async (event, context) => {
  const { imageFileID } = event

  // 参数校验
  if (!imageFileID) {
    return { code: -1, msg: '缺少 imageFileID 参数', data: null }
  }

  // API Key 检查
  if (!BAIDU_API_KEY || !BAIDU_SECRET_KEY) {
    console.error('[identify] BAIDU_API_KEY or BAIDU_SECRET_KEY not configured')
    return { code: -2, msg: '百度 API 未配置', data: null }
  }

  try {
    // Step 1: 从云存储下载图片并转为 base64
    const downloadResult = await cloud.downloadFile({ fileID: imageFileID })
    const imageBuffer = downloadResult.fileContent
    const imageBase64 = imageBuffer.toString('base64')

    // Step 2: 获取百度 access_token
    let accessToken
    try {
      accessToken = await getBaiduToken()
    } catch (err) {
      console.error('[identify] OAuth failed:', err.message)
      return { code: -3, msg: '百度认证失败', data: { recognized: false } }
    }

    // Step 3: 调用百度菜品识别
    const baiduResult = await callBaiduDishRecognition(accessToken, imageBase64, 0)

    // Step 4: 解析结果
    const parsed = parseBaiduResult(baiduResult)

    if (!parsed) {
      // B04 降级：识别失败 → 返回 recognized: false → 前端展示手动输入
      return {
        code: 0,
        msg:  '未能识别食物，请手动输入',
        data: { recognized: false },
      }
    }

    // 识别成功
    return {
      code: 0,
      msg:  '识别成功',
      data: {
        ...parsed,
        recognized: true,
      },
    }

  } catch (err) {
    console.error('[identify] Unexpected error:', err)
    // 兜底：任何未预期的错误都返回降级
    return {
      code: -99,
      msg:  '识别服务异常，请手动输入',
      data: { recognized: false },
    }
  }
}
