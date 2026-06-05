const cloud = require('wx-server-sdk')
const https = require('https')
const http = require('http')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

// ============ 百度 OAuth ============

let cachedToken = null
let tokenExpireAt = 0

function httpsPost(hostname, path, body, contentType) {
  return new Promise((resolve, reject) => {
    const data = typeof body === 'string' ? body : JSON.stringify(body)
    const options = {
      hostname,
      path,
      method: 'POST',
      timeout: 15000,
      headers: {
        'Content-Type': contentType,
        'Content-Length': Buffer.byteLength(data)
      }
    }
    const req = https.request(options, (res) => {
      let chunks = []
      res.on('data', c => chunks.push(c))
      res.on('end', () => {
        const raw = Buffer.concat(chunks).toString('utf-8')
        try { resolve(JSON.parse(raw)) } catch { resolve({ _raw: raw, _parseError: true }) }
      })
    })
    req.on('error', reject)
    req.on('timeout', () => { req.destroy(); reject(new Error('request timeout')) })
    req.write(data)
    req.end()
  })
}

async function getBaiduToken() {
  if (cachedToken && Date.now() < tokenExpireAt) return cachedToken
  const apiKey = process.env.BAIDU_API_KEY
  const secretKey = process.env.BAIDU_SECRET_KEY
  if (!apiKey || !secretKey) throw new Error('BAIDU_API_KEY / BAIDU_SECRET_KEY not set')
  const path = `/oauth/2.0/token?grant_type=client_credentials&client_id=${apiKey}&client_secret=${secretKey}`
  const res = await httpsPost('aip.baidubce.com', path, '', 'application/json')
  if (!res.access_token) throw new Error('baidu token failed: ' + JSON.stringify(res))
  cachedToken = res.access_token
  tokenExpireAt = Date.now() + (res.expires_in - 60) * 1000
  return cachedToken
}

// ============ 百度菜品识别 ============

async function callBaiduDishRecognition(imageBase64, retryCount = 0) {
  try {
    const token = await getBaiduToken()
    const path = `/rest/2.0/image-classify/v2/dish?access_token=${token}`
    const body = `image=${encodeURIComponent(imageBase64)}&top_num=1&filter_threshold=0.3`
    const res = await httpsPost('aip.baidubce.com', path, body, 'application/x-www-form-urlencoded')

    if (res.error_code) {
      if (retryCount < 1) {
        console.warn('百度识别返回错误，重试:', res.error_code, res.error_msg)
        return callBaiduDishRecognition(imageBase64, retryCount + 1)
      }
      return { recognized: false, errorCode: res.error_code, errorMsg: res.error_msg }
    }

    if (!res.result || !Array.isArray(res.result) || res.result.length === 0) {
      if (retryCount < 1) return callBaiduDishRecognition(imageBase64, retryCount + 1)
      return { recognized: false, errorCode: 'EMPTY_RESULT', errorMsg: '百度未返回识别结果' }
    }

    const top = res.result[0]
    return { recognized: true, data: top }
  } catch (err) {
    if (retryCount < 1) {
      console.warn('百度识别异常，重试:', err.message)
      return callBaiduDishRecognition(imageBase64, retryCount + 1)
    }
    return { recognized: false, errorCode: 'EXCEPTION', errorMsg: err.message }
  }
}

// ============ 食物类别映射 ============

const CATEGORY_MAP = {
  '米饭': 'staple', '面条': 'noodle', '馒头': 'staple', '面包': 'staple', '粥': 'congee',
  '汉堡': 'burger', '三明治': 'burger', '热狗': 'burger',
  '鸡肉': 'meat', '牛肉': 'meat', '猪肉': 'meat', '排骨': 'meat', '羊肉': 'meat',
  '鱼': 'seafood', '虾': 'seafood', '蟹': 'seafood', '贝': 'seafood',
  '鸡蛋': 'egg', '茶叶蛋': 'egg', '蛋糕': 'dessert',
  '豆腐': 'tofu', '豆浆': 'tofu',
  '蔬菜': 'vegetable', '沙拉': 'salad',
  '水果': 'fruit',
  '汤': 'soup',
  '拉面': 'noodle', '意面': 'noodle', '米线': 'noodle',
  '披萨': 'pizza',
  '寿司': 'sushi',
  '火锅': 'hotpot', '麻辣烫': 'hotpot',
  '奶茶': 'milk_tea', '咖啡': 'milk_tea', '饮料': 'milk_tea',
  '甜品': 'dessert', '冰淇淋': 'dessert',
  '炸鸡': 'fried', '薯条': 'fried', '油条': 'fried',
  '饼干': 'snack', '薯片': 'snack', '坚果': 'snack'
}

function guessCategory(foodName) {
  for (const [keyword, cat] of Object.entries(CATEGORY_MAP)) {
    if (foodName.includes(keyword)) return cat
  }
  return 'other'
}

// ============ 主函数 ============

exports.main = async (event, context) => {
  const { imageFileID, imageUrl } = event
  const wxContext = cloud.getWXContext()

  if (!imageFileID && !imageUrl) {
    return { success: false, errorCode: 'MISSING_IMAGE', errorMessage: '缺少图片参数', data: null }
  }

  try {
    // 1. 获取图片 base64
    let imageBase64
    if (imageFileID) {
      const fileRes = await cloud.downloadFile({ fileID: imageFileID })
      imageBase64 = fileRes.fileContent.toString('base64')
    } else {
      // 如果传的是 URL，需要先下载（简化处理：直接让前端传 fileID）
      return { success: false, errorCode: 'USE_FILE_ID', errorMessage: '请传 imageFileID', data: null }
    }

    // 2. 调百度识别（含重试 + 降级）
    const result = await callBaiduDishRecognition(imageBase64)

    if (!result.recognized) {
      return {
        success: true,
        data: {
          recognized: false,
          errorCode: result.errorCode,
          errorMessage: result.errorMsg,
          foodName: null,
          calories: null,
          nutrition: null,
          category: null,
          confidence: null
        }
      }
    }

    // 3. 解析百度返回
    const dish = result.data
    const foodName = dish.name || '未知食物'
    const caloriePer100g = dish.calorie ? parseFloat(dish.calorie) : null
    const confidence = dish.probability ? Math.round(parseFloat(dish.probability) * 100) : null
    const category = guessCategory(foodName)

    // 营养占比（百度不返回，用默认估算，后续可接营养数据库）
    const nutrition = {
      fatRatio: dish.fat_ratio ? Math.round(dish.fat_ratio * 100) : null,
      proteinRatio: dish.protein_ratio ? Math.round(dish.protein_ratio * 100) : null,
      carbRatio: dish.carb_ratio ? Math.round(dish.carb_ratio * 100) : null
    }

    // 如果百度没返回营养数据，用默认估算
    if (!nutrition.fatRatio) {
      nutrition.fatRatio = 30
      nutrition.proteinRatio = 30
      nutrition.carbRatio = 40
    }

    return {
      success: true,
      data: {
        recognized: true,
        foodName,
        calories: caloriePer100g,
        caloriesPer100g: caloriePer100g,
        price: null,
        nutrition,
        category,
        confidence
      }
    }
  } catch (err) {
    console.error('identifyFood 失败:', err)
    return {
      success: false,
      errorCode: 'INTERNAL_ERROR',
      errorMessage: err.message || '识别服务异常',
      data: { recognized: false }
    }
  }
}
